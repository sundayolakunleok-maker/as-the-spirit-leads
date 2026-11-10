'use strict';
const { db, getSetting, setSetting } = require('./db');
const v = require('./validate');
const notify = require('./notify');
const { requireAdmin } = require('./auth');

function listAdmins() {
  return db.prepare('SELECT id, name, email, role FROM admins WHERE active = 1 ORDER BY name').all();
}

function listRequests(admin, { status = '' } = {}) {
  let sql = `SELECT r.*, c.name AS category_name, a.name AS assigned_name
    FROM requests r LEFT JOIN categories c ON c.id = r.category_id
    LEFT JOIN admins a ON a.id = r.assigned_to WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND r.status = ?'; params.push(status); }
  if (admin.role !== 'admin') { sql += ' AND r.assigned_to = ?'; params.push(admin.id); }
  sql += ' ORDER BY r.created_at DESC, r.id DESC';
  return db.prepare(sql).all(...params);
}

function listBookings(admin, { status = '' } = {}) {
  let sql = `SELECT b.*, c.name AS category_name, co.name AS counselor_name
    FROM bookings b LEFT JOIN categories c ON c.id = b.category_id
    LEFT JOIN counselors co ON co.id = b.counselor_id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND b.status = ?'; params.push(status); }
  if (admin.role !== 'admin') { sql += ' AND b.counselor_id = (SELECT id FROM counselors WHERE slug = ?)'; params.push(admin.counselor_slug || '__none__'); }
  sql += ' ORDER BY b.session_date DESC, b.session_time DESC, b.id DESC';
  return db.prepare(sql).all(...params);
}

function adminStats(admin, ctx) {
  const today = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const one = (sql, ...p) => db.prepare(sql).get(...p).n;
  return {
    newRequests: one("SELECT COUNT(*) AS n FROM requests WHERE status = 'new'"),
    pendingBookings: one("SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending'"),
    todayBookings: one("SELECT COUNT(*) AS n FROM bookings WHERE session_date = ? AND status IN ('pending','confirmed')", today),
    requestsWeek: one('SELECT COUNT(*) AS n FROM requests WHERE created_at >= ?', weekAgo),
    bookingsWeek: one('SELECT COUNT(*) AS n FROM bookings WHERE created_at >= ?', weekAgo),
    anonymousTotal: one("SELECT COUNT(*) AS n FROM requests WHERE (contact_email IS NULL OR contact_email = '') AND (contact_phone IS NULL OR contact_phone = '')"),
    counselors: one('SELECT COUNT(*) AS n FROM counselors WHERE active = 1'),
  };
}

async function handle(req, res, { path, method, body, session, json, url }) {
  const gate = requireAdmin(session, ['admin', 'counselor']);
  if (!gate.ok) return json(res, gate.status, { error: gate.error });
  const isAdmin = session.admin.role === 'admin';

  if (path === '/api/admin/stats' && method === 'GET') {
    return json(res, 200, adminStats(session.admin, null));
  }

  let m = path.match(/^\/api\/admin\/requests\/(\d+)$/);
  if (m && method === 'POST') {
    const id = Number(m[1]);
    const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!row) return json(res, 404, { error: 'Request not found.' });
    if (!isAdmin && row.assigned_to !== session.admin.id) return json(res, 403, { error: 'This request is not assigned to you.' });
    const status = body.status ? v.oneOf(body.status, ['new', 'in-progress', 'replied', 'closed'], 'status') : row.status;
    let assignedTo = row.assigned_to;
    if (body.assigned_to !== undefined) {
      if (!isAdmin) return json(res, 403, { error: 'Only administrators can reassign requests.' });
      assignedTo = body.assigned_to === '' ? null : Number(body.assigned_to);
      if (assignedTo && !db.prepare('SELECT 1 FROM admins WHERE id = ?').get(assignedTo)) assignedTo = null;
    }
    const note = body.admin_note !== undefined ? v.str(body.admin_note, { max: 4000, field: 'admin_note' }) : row.admin_note;
    const reply = body.reply_text !== undefined ? v.str(body.reply_text, { max: 6000, field: 'reply_text' }) : row.reply_text;
    db.prepare("UPDATE requests SET status=?, assigned_to=?, admin_note=?, reply_text=?, updated_at=datetime('now') WHERE id=?")
      .run(status, assignedTo, note, reply, id);
    return json(res, 200, { ok: true });
  }

  m = path.match(/^\/api\/admin\/bookings\/(\d+)$/);
  if (m && method === 'POST') {
    const id = Number(m[1]);
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!row) return json(res, 404, { error: 'Booking not found.' });
    const status = body.status ? v.oneOf(body.status, ['pending', 'confirmed', 'completed', 'cancelled'], 'status') : row.status;
    const note = body.admin_note !== undefined ? v.str(body.admin_note, { max: 2000, field: 'admin_note' }) : row.admin_note;
    db.prepare("UPDATE bookings SET status=?, admin_note=?, updated_at=datetime('now') WHERE id=?").run(status, note, id);
    if (status !== row.status && body.notify !== false) {
      const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(row.category_id);
      notify.queue('email', row.email, `Booking ${status} (${row.ref}) - As the Spirit Leads`,
        `Dear ${row.client_name},\n\nYour booking ${row.ref} (${cat ? cat.name : 'counselling'}) for ${row.session_date} at ${row.session_time} WAT is now ${status}.\n\n${status === 'cancelled' ? 'If this was not expected, reply to this email and we will help you rebook.' : 'We look forward to meeting you.'}\n\nAs the Spirit Leads\n${getSetting('email')}`);
    }
    return json(res, 200, { ok: true });
  }

  if (path === '/api/admin/counselors' && method === 'POST') {
    if (!isAdmin) return json(res, 403, { error: 'Only administrators can manage counsellors.' });
    const id = body.id ? Number(body.id) : null;
    const name = v.str(body.name, { min: 2, max: 160, field: 'name', required: true });
    const title = v.str(body.title, { min: 2, max: 200, field: 'title', required: true });
    const slugBase = name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    const fields = {
      name, title,
      photo: v.str(body.photo, { max: 300, field: 'photo' }) || '/assets/emblem.png',
      qualifications: v.str(body.qualifications, { max: 400, field: 'qualifications' }),
      bio: v.str(body.bio, { max: 4000, field: 'bio' }),
      approach: v.str(body.approach, { max: 2000, field: 'approach' }),
      languages: v.str(body.languages, { max: 200, field: 'languages' }) || 'English',
      specialties: v.str(body.specialties, { max: 500, field: 'specialties' }),
      formats: v.str(body.formats, { max: 100, field: 'formats' }) || 'online,telephone,in-person',
      work_days: v.str(body.work_days, { max: 30, field: 'work_days' }) || '1,2,3,4,5',
      whatsapp: v.str(body.whatsapp, { max: 30, field: 'whatsapp' }),
      role_label: v.str(body.role_label, { max: 60, field: 'role_label' }),
      active: body.active === false || body.active === '0' ? 0 : 1,
    };
    if (body.id) {
      const existing = db.prepare('SELECT * FROM counselors WHERE id = ?').get(id);
      if (!existing) return json(res, 404, { error: 'Counsellor not found.' });
      db.prepare(`UPDATE counselors SET name=?, title=?, photo=?, qualifications=?, bio=?, approach=?, languages=?,
        specialties=?, formats=?, work_days=?, whatsapp=?, role_label=?, active=? WHERE id=?`)
        .run(fields.name, fields.title, fields.photo, fields.qualifications, fields.bio, fields.approach,
          fields.languages, fields.specialties, fields.formats, fields.work_days, fields.whatsapp,
          fields.role_label, fields.active, id);
      return json(res, 200, { ok: true, id });
    }
    let slug = slugBase || 'counsellor';
    let n = 1;
    while (db.prepare('SELECT 1 FROM counselors WHERE slug = ?').get(slug)) slug = `${slugBase}-${++n}`;
    const info = db.prepare(`INSERT INTO counselors (slug,name,title,photo,qualifications,bio,approach,languages,specialties,formats,work_days,whatsapp,role_label,active,position)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,(SELECT COALESCE(MAX(position),0)+1 FROM counselors))`)
      .run(slug, fields.name, fields.title, fields.photo, fields.qualifications, fields.bio, fields.approach,
        fields.languages, fields.specialties, fields.formats, fields.work_days, fields.whatsapp, fields.role_label, fields.active);
    return json(res, 201, { ok: true, id: Number(info.lastInsertRowid), slug });
  }

  m = path.match(/^\/api\/admin\/counselors\/(\d+)\/(deactivate|delete)$/);
  if (m && method === 'POST') {
    if (!isAdmin) return json(res, 403, { error: 'Only administrators can manage counsellors.' });
    const id = Number(m[1]);
    if (m[2] === 'delete') {
      const hasBookings = db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE counselor_id = ?').get(id).n;
      if (hasBookings) {
        db.prepare('UPDATE counselors SET active = 0 WHERE id = ?').run(id);
        return json(res, 200, { ok: true, deactivated: true, note: 'Counsellor has bookings, so the profile was deactivated instead of deleted.' });
      }
      db.prepare('DELETE FROM counselors WHERE id = ?').run(id);
      return json(res, 200, { ok: true, deleted: true });
    }
    db.prepare('UPDATE counselors SET active = 0 WHERE id = ?').run(id);
    return json(res, 200, { ok: true });
  }
  m = path.match(/^\/api\/admin\/counselors\/(\d+)\/activate$/);
  if (m && method === 'POST') {
    if (!isAdmin) return json(res, 403, { error: 'Only administrators can manage counsellors.' });
    db.prepare('UPDATE counselors SET active = 1 WHERE id = ?').run(Number(m[1]));
    return json(res, 200, { ok: true });
  }

  if (path === '/api/admin/settings' && method === 'POST') {
    if (!isAdmin) return json(res, 403, { error: 'Only administrators can change settings.' });
    const allowed = ['site_name', 'tagline', 'phone', 'whatsapp', 'email', 'address', 'hours'];
    for (const key of allowed) {
      if (body[key] !== undefined) setSetting(key, v.str(body[key], { max: 300, field: key }));
    }
    if (body.new_password) {
      const pwd = String(body.new_password);
      if (pwd.length < 10) return json(res, 422, { error: 'Password must be at least 10 characters.' });
      const { hashPassword } = require('./auth');
      db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(pwd), session.admin.id);
    }
    return json(res, 200, { ok: true });
  }

  m = path.match(/^\/api\/admin\/outbox\/(\d+)\/retry$/);
  if (m && method === 'POST') {
    if (!isAdmin) return json(res, 403, { error: 'Only administrators can retry notifications.' });
    db.prepare("UPDATE outbox SET status='queued', error='' WHERE id=?").run(Number(m[1]));
    await notify.deliver(Number(m[1]));
    const row = db.prepare('SELECT status, error FROM outbox WHERE id=?').get(Number(m[1]));
    return json(res, 200, { ok: row.status === 'sent', status: row.status, error: row.error });
  }

  if (path === '/api/admin/outbox/retry-all' && method === 'POST') {
    if (!isAdmin) return json(res, 403, { error: 'Only administrators can retry notifications.' });
    await notify.flushOutbox(50);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'Unknown admin endpoint.' });
}

module.exports = { handle, adminStats, listRequests, listBookings, listAdmins };
