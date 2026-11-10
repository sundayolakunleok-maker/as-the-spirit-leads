'use strict';
const { db, getSetting } = require('./db');
const {
  sessionFromRequest, createSession, destroySession, verifyPassword, rateLimit, resetRateLimit,
  checkCsrf, requireAdmin, parseCookies, cookie, clearCookie, SESSION_COOKIE, CSRF_COOKIE,
} = require('./auth');
const v = require('./validate');
const notify = require('./notify');
const adminApi = require('./api-admin');

const SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

function json(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? String(fwd).split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function csrfOk(req, session) {
  if (session) return checkCsrf(req, session);
  const cookies = parseCookies(req.headers.cookie || '');
  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];
  if (cookieToken && headerToken) return cookieToken === headerToken;
  // No token at all: only accept a genuine same-origin browser request.
  // Browsers always send Origin on cross-origin and same-origin POSTs.
  return Boolean(req.headers.origin) && sameOrigin(req);
}

function requireCsrf(req, res, session) {
  if (!csrfOk(req, session)) {
    json(res, 403, { error: 'Security check failed. Please reload the page and try again.' });
    return false;
  }
  return true;
}

function categoryById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function counselorBySlug(slug) {
  return db.prepare('SELECT * FROM counselors WHERE slug = ? AND active = 1').get(slug);
}

function counselorById(id) {
  return db.prepare('SELECT * FROM counselors WHERE id = ? AND active = 1').get(id);
}

function takenSlots(counselorId, date) {
  return db.prepare("SELECT session_time FROM bookings WHERE counselor_id = ? AND session_date = ? AND status IN ('pending','confirmed')")
    .all(counselorId, date).map((r) => r.session_time);
}

function availability(counselorId, date) {
  if (!date) throw new v.ValidationError({ date: 'Choose a date.' });
  if (Number.isNaN(Date.parse(date))) throw new v.ValidationError({ date: 'Choose a valid date.' });
  if (v.isPastDate(date)) return { date, slots: [], closed: true, reason: 'That date has passed.' };
  let counselors = counselorId ? [counselorById(counselorId)] : db.prepare('SELECT * FROM counselors WHERE active = 1').all();
  counselors = counselors.filter(Boolean);
  if (!counselors.length) return { date, slots: [], closed: true, reason: 'No counsellor available.' };
  const weekday = String(new Date(`${date}T12:00:00Z`).getUTCDay());
  const eligible = counselors.filter((c) => String(c.work_days).split(',').includes(weekday));
  if (!eligible.length) return { date, slots: [], closed: true, reason: 'No sessions on that day.' };
  const busy = new Set();
  for (const c of eligible) for (const t of takenSlots(c.id, date)) busy.add(t);
  return { date, slots: SLOTS.filter((s) => !busy.has(s)), closed: false };
}

async function handle(req, res, helpers) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method;
  const session = sessionFromRequest(req);
  let body = {};
  if (method !== 'GET' && method !== 'HEAD') body = await helpers.readBody(req);

  try {
    // ---------- public ----------
    if (path === '/api/counselors' && method === 'GET') {
      const category = url.searchParams.get('category');
      let rows = db.prepare('SELECT id,slug,name,title,photo,specialties,languages,formats,role_label FROM counselors WHERE active = 1 ORDER BY position').all();
      if (category) rows = rows.filter((r) => String(r.specialties).split(',').includes(category));
      return json(res, 200, { counselors: rows });
    }

    if (path === '/api/availability' && method === 'GET') {
      const raw = url.searchParams.get('counselor') || '';
      let counselorId = null;
      if (raw) {
        if (/^\d+$/.test(raw)) counselorId = Number(raw);
        else {
          const row = counselorBySlug(raw);
          counselorId = row ? row.id : null;
        }
      }
      const date = url.searchParams.get('date') || '';
      try {
        return json(res, 200, availability(counselorId, date));
      } catch (err) {
        return json(res, 422, { error: err.errors ? Object.values(err.errors)[0] : 'Invalid request.' });
      }
    }

    if (path === '/api/requests' && method === 'POST') {
      if (!requireCsrf(req, res, session)) return;
      const limit = rateLimit(`req:${clientIp(req)}`, 6, 600);
      if (!limit.allowed) return json(res, 429, { error: 'Too many submissions. Please wait a few minutes and try again.' });
      if (body.website) return json(res, 201, { ok: true, ref: 'ASL-RECEIVED' }); // honeypot
      const categoryId = Number(body.category);
      if (!categoryById(categoryId)) throw new v.ValidationError({ category: 'Choose a counselling category.' });
      const question = v.str(body.question, { min: 20, max: 4000, field: 'question', required: true });
      const responseMethod = v.oneOf(body.response_method || 'none', ['none', 'email', 'whatsapp', 'phone'], 'response_method');
      let contactEmail = v.optionalEmail(body.contact_email, 'contact_email');
      let contactPhone = v.optionalPhone(body.contact_phone, 'contact_phone');
      const contactName = v.str(body.contact_name, { max: 120, field: 'contact_name' });
      if (responseMethod === 'email' && !contactEmail) throw new v.ValidationError({ contact_email: 'Add an email so we can reply.' });
      if ((responseMethod === 'whatsapp' || responseMethod === 'phone') && !contactPhone) throw new v.ValidationError({ contact_phone: 'Add a phone number so we can reply.' });
      if (responseMethod === 'none') { contactEmail = contactEmail || ''; }

      let ref;
      for (let i = 0; i < 5; i++) {
        ref = v.makeRef('ASL');
        if (!db.prepare('SELECT 1 FROM requests WHERE ref = ?').get(ref)) break;
      }
      const info = db.prepare(`INSERT INTO requests (ref,category_id,question,response_method,contact_name,contact_email,contact_phone)
        VALUES (?,?,?,?,?,?,?)`).run(ref, categoryId, question, responseMethod, contactName, contactEmail, contactPhone);
      const cat = categoryById(categoryId);
      const contactLine = contactEmail || contactPhone ? `Client contact: ${[contactEmail, contactPhone].filter(Boolean).join(' / ')}` : 'Fully anonymous submission (no contact details).';
      notify.notifyOrg(
        `New anonymous counselling request ${ref}`,
        `Reference: ${ref}\nCategory: ${cat.name}\nPreferred reply: ${responseMethod}\n${contactLine}\n\nQuestion (verbatim):\n${question}\n\nOpen the admin dashboard to assign and respond.`
      );
      if (contactEmail) {
        notify.queue('email', contactEmail, `We received your question (${ref})`,
          `Thank you for reaching out to As the Spirit Leads.\n\nYour reference number is ${ref}. A counsellor in ${cat.name} will review your question.\n\n${responseMethod === 'none' ? 'Because you chose not to leave a contact method, please check back with this reference number if you would like a reply.' : 'We will reply through the channel you selected, within one to two working days.'}\n\nThis is a confidential service. If you are in immediate danger, please contact emergency services.\n\nAs the Spirit Leads\n${getSetting('email')}`);
      }
      if (contactPhone && (responseMethod === 'whatsapp' || responseMethod === 'phone')) {
        notify.queue('whatsapp', contactPhone, '', `As the Spirit Leads: we received your question. Reference ${ref}. A counsellor will respond shortly.`);
      }
      return json(res, 201, { ok: true, ref, message: `Your reference number is ${ref}.` });
    }

    if (path === '/api/bookings' && method === 'POST') {
      if (!requireCsrf(req, res, session)) return;
      const limit = rateLimit(`book:${clientIp(req)}`, 8, 600);
      if (!limit.allowed) return json(res, 429, { error: 'Too many booking attempts. Please wait a few minutes and try again.' });
      const categoryId = Number(body.category);
      if (!categoryById(categoryId)) throw new v.ValidationError({ category: 'Choose a counselling category.' });
      const format = v.oneOf(body.format || 'online', ['online', 'telephone', 'in-person'], 'format');
      const date = v.dateISO(body.date, 'date');
      const time = v.timeHHMM(body.time, 'time');
      if (v.isPastDate(date)) throw new v.ValidationError({ date: 'Choose today or a future date.' });
      if (!SLOTS.includes(time)) throw new v.ValidationError({ time: 'Choose one of the available session times.' });
      const clientName = v.str(body.client_name, { min: 2, max: 120, field: 'client_name', required: true });
      const email = v.email(body.email);
      const phone = v.optionalPhone(body.phone);
      const notes = v.str(body.notes, { max: 2000, field: 'notes' });
      if (!body.consent) throw new v.ValidationError({ consent: 'Please confirm you understand the terms.' });

      let counselor = null;
      if (body.counselor) {
        counselor = counselorBySlug(String(body.counselor));
        if (!counselor) throw new v.ValidationError({ counselor: 'That counsellor is not available.' });
      } else {
        const weekday = String(new Date(`${date}T12:00:00Z`).getUTCDay());
        const candidates = db.prepare('SELECT * FROM counselors WHERE active = 1 ORDER BY position').all()
          .filter((c) => String(c.specialties).split(',').includes(categoryById(categoryId).slug)
            && String(c.work_days).split(',').includes(weekday)
            && !takenSlots(c.id, date).includes(time));
        counselor = candidates[0] || db.prepare('SELECT * FROM counselors WHERE active = 1 ORDER BY position').all()
          .find((c) => String(c.work_days).split(',').includes(weekday) && !takenSlots(c.id, date).includes(time));
        if (!counselor) throw new v.ValidationError({ time: 'That slot was just taken. Please choose another time.' });
      }
      if (takenSlots(counselor.id, date).includes(time)) {
        return json(res, 409, { error: 'That time was just booked by someone else. Please choose another slot.', code: 'SLOT_TAKEN' });
      }
      let ref;
      for (let i = 0; i < 5; i++) {
        ref = v.makeRef('BKG');
        if (!db.prepare('SELECT 1 FROM bookings WHERE ref = ?').get(ref)) break;
      }
      try {
        db.prepare(`INSERT INTO bookings (ref,category_id,counselor_id,format,session_date,session_time,client_name,email,phone,notes)
          VALUES (?,?,?,?,?,?,?,?,?,?)`).run(ref, categoryId, counselor.id, format, date, time, clientName, email, phone, notes);
      } catch (err) {
        if (String(err.message).includes('UNIQUE')) {
          return json(res, 409, { error: 'That time was just booked by someone else. Please choose another slot.', code: 'SLOT_TAKEN' });
        }
        throw err;
      }
      const cat = categoryById(categoryId);
      const when = `${date} at ${time} WAT (${format})`;
      notify.notifyOrg(`New booking ${ref}`, `Reference: ${ref}\nClient: ${clientName}\nEmail: ${email}\nPhone: ${phone || '—'}\nService: ${cat.name}\nCounsellor: ${counselor.name}\nWhen: ${when}\n\nNotes: ${notes || '—'}`);
      notify.queue('email', email, `Booking received (${ref}) - As the Spirit Leads`,
        `Dear ${clientName},\n\nYour counselling booking has been received.\n\nReference: ${ref}\nService: ${cat.name}\nCounsellor: ${counselor.name}\nWhen: ${when}\nDuration: 50 minutes\n\nWe will confirm shortly. To reschedule, reply to this email or write to ${getSetting('email')} quoting your reference.\n\nAll times are West Africa Time (UTC+1). If you are in immediate danger, contact emergency services.\n\nAs the Spirit Leads`);
      if (phone) notify.queue('whatsapp', phone, '', `As the Spirit Leads: booking ${ref} received for ${when}. We will confirm shortly.`);
      return json(res, 201, {
        ok: true,
        ref,
        booking: { ref, category: cat.name, counselor: counselor.name, date, time, format, duration: 50 },
      });
    }

    // ---------- admin auth ----------
    if (path === '/api/admin/login' && method === 'POST') {
      if (!sameOrigin(req)) return json(res, 403, { error: 'Request blocked.' });
      const key = `login:${clientIp(req)}`;
      const limit = rateLimit(key, 8, 900);
      if (!limit.allowed) return json(res, 429, { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` });
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const admin = db.prepare('SELECT * FROM admins WHERE email = ? AND active = 1').get(email);
      if (!admin || !verifyPassword(password, admin.password_hash)) {
        return json(res, 401, { error: 'Email or password is incorrect.' });
      }
      resetRateLimit(key);
      const s = createSession(admin.id);
      return json(res, 200, { ok: true, redirect: '/admin' }, {
        'Set-Cookie': [cookie(SESSION_COOKIE, s.id, { maxAge: 60 * 60 * 8, secure: req.headers['x-forwarded-proto'] === 'https' })],
      });
    }

    if (path === '/api/admin/logout' && method === 'POST') {
      if (session) destroySession(session.id);
      return json(res, 200, { ok: true }, { 'Set-Cookie': [clearCookie(SESSION_COOKIE)] });
    }

    // ---------- admin endpoints ----------
    if (path.startsWith('/api/admin/')) {
      if (!session) return json(res, 401, { error: 'Sign in required.' });
      if (method !== 'GET' && !requireCsrf(req, res, session)) return;
      return await adminApi.handle(req, res, { path, method, body, session, json, url });
    }

    return json(res, 404, { error: 'Unknown endpoint.' });
  } catch (err) {
    if (err instanceof v.ValidationError) return json(res, 422, { error: Object.values(err.errors)[0], errors: err.errors });
    console.error('[api]', err);
    return json(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong. Please try again.' });
  }
}

module.exports = {
  handle, json, SLOTS, availability, takenSlots, categoryById,
  adminStats: adminApi.adminStats,
  listRequests: adminApi.listRequests,
  listBookings: adminApi.listBookings,
  listAdmins: adminApi.listAdmins,
};
