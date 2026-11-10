'use strict';
const { esc, icon } = require('./layout');

function adminHead(title, extra = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | As the Spirit Leads Admin</title>
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/assets/emblem.png">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css?v=5">
<link rel="stylesheet" href="/css/admin.css?v=5">
<meta name="csrf-token" content="${esc(extra)}">
</head>`;
}

function login(ctx, { error = '' } = {}) {
  return `${adminHead('Staff sign in')}
<body class="admin-login-page">
  <main class="admin-login">
    <div class="login-card">
      <img src="/assets/emblem.png" alt="" width="52" height="52">
      <h1>Staff sign in</h1>
      <p class="muted">Administrators and counsellors only. Sessions end after 8 hours of inactivity.</p>
      ${error ? `<div class="alert alert-red" role="alert">${esc(error)}</div>` : ''}
      <form data-form="login" novalidate>
        <div class="field"><label for="email">Work email</label><input id="email" name="email" type="email" autocomplete="username" required autofocus></div>
        <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
        <div class="form-error" data-form-error role="alert" hidden></div>
        <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      </form>
      <p class="fine-print"><a href="/">Back to website</a></p>
    </div>
  </main>
  <script src="/js/admin.js?v=5" defer></script>
</body></html>`;
}

function statusBadge(status) {
  const map = {
    new: 'badge-blue', pending: 'badge-amber', confirmed: 'badge-green', completed: 'badge-green',
    cancelled: 'badge-grey', 'in-progress': 'badge-blue', closed: 'badge-grey', sent: 'badge-green',
    queued: 'badge-amber', failed: 'badge-red', 'no-transport': 'badge-grey', replied: 'badge-blue',
  };
  return `<span class="badge ${map[status] || 'badge-grey'}">${esc(status)}</span>`;
}

function nav(ctx, active) {
  const items = [
    ['overview', 'Overview', 'shield'],
    ['requests', 'Counselling requests', 'chat'],
    ['bookings', 'Bookings', 'calendar'],
    ['counselors', 'Counsellors', 'users'],
    ['outbox', 'Notification log', 'mail'],
    ['settings', 'Settings', 'compass'],
  ];
  return items.map(([id, label, ic]) => `
    <a href="/admin/${id}" class="admin-nav-link${active === id ? ' is-active' : ''}">${icon(ic, 'ico ico-sm')} ${label}</a>`).join('');
}

function dashboard(ctx, { active, content, admin, csrf, stats }) {
  return `${adminHead('Dashboard', csrf)}
<body class="admin-page">
  <div class="admin-shell">
    <aside class="admin-side">
      <a href="/admin" class="admin-brand"><img src="/assets/emblem.png" alt="" width="36" height="36"><span>As the Spirit Leads<small>Admin</small></span></a>
      <nav class="admin-nav">${nav(ctx, active)}</nav>
      <div class="admin-side-foot">
        <p class="muted small">${esc(admin.name)}<br>${esc(admin.role)}</p>
        <a href="/" class="admin-nav-link">${icon('arrow', 'ico ico-sm')} View website</a>
        <button class="admin-nav-link" type="button" data-logout>${icon('lock', 'ico ico-sm')} Sign out</button>
      </div>
    </aside>
    <main class="admin-main">
      <header class="admin-top">
        <div>
          <p class="crumb">Admin ${icon('arrow', 'ico ico-xs')} ${esc(active)}</p>
          <h1>${esc(active.charAt(0).toUpperCase() + active.slice(1))}</h1>
        </div>
        <div class="admin-top-stats">
          <div><strong>${stats.newRequests}</strong><span>new requests</span></div>
          <div><strong>${stats.pendingBookings}</strong><span>pending bookings</span></div>
          <div><strong>${stats.todayBookings}</strong><span>today</span></div>
        </div>
      </header>
      <div class="admin-content">${content}</div>
    </main>
  </div>
  <script src="/js/admin.js?v=5" defer></script>
</body></html>`;
}

function overview(ctx, data) {
  const { requests, bookings, stats } = data;
  const recentRows = requests.slice(0, 6).map((r) => `
    <tr><td><code>${esc(r.ref)}</code></td><td>${esc(r.category_name || '—')}</td>
    <td class="trunc">${esc(r.question)}</td><td>${statusBadge(r.status)}</td><td>${esc(r.created_at)}</td></tr>`).join('');
  const bookingRows = bookings.slice(0, 6).map((b) => `
    <tr><td><code>${esc(b.ref)}</code></td><td>${esc(b.client_name)}</td><td>${esc(b.counselor_name || 'Next available')}</td>
    <td>${esc(b.session_date)} ${esc(b.session_time)}</td><td>${statusBadge(b.status)}</td></tr>`).join('');
  return `
  <div class="stat-cards">
    <div class="stat-card"><span>Requests this week</span><strong>${stats.requestsWeek}</strong></div>
    <div class="stat-card"><span>Bookings this week</span><strong>${stats.bookingsWeek}</strong></div>
    <div class="stat-card"><span>Anonymous submissions</span><strong>${stats.anonymousTotal}</strong></div>
    <div class="stat-card"><span>Active counsellors</span><strong>${stats.counselors}</strong></div>
  </div>
  <div class="admin-panels">
    <section class="panel">
      <div class="panel-head"><h2>Latest requests</h2><a href="/admin/requests" class="link-arrow">All requests</a></div>
      <table class="admin-table"><thead><tr><th>Ref</th><th>Category</th><th>Question</th><th>Status</th><th>Received</th></tr></thead>
      <tbody>${recentRows || '<tr><td colspan="5" class="empty">No requests yet.</td></tr>'}</tbody></table>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Upcoming bookings</h2><a href="/admin/bookings" class="link-arrow">All bookings</a></div>
      <table class="admin-table"><thead><tr><th>Ref</th><th>Client</th><th>Counsellor</th><th>When</th><th>Status</th></tr></thead>
      <tbody>${bookingRows || '<tr><td colspan="5" class="empty">No bookings yet.</td></tr>'}</tbody></table>
    </section>
  </div>
  <section class="panel">
    <div class="panel-head"><h2>Notification transport</h2></div>
    <p class="muted">Email: ${data.transports.smtp ? 'SMTP configured' : data.transports.resend ? 'Resend configured' : 'not configured'} &middot;
    WhatsApp Cloud API: ${data.transports.whatsapp ? 'configured' : 'not configured'}.
    Configure credentials in your environment file. Failed notifications appear in the notification log and can be retried.</p>
  </section>`;
}

function requestsTable(ctx, rows, admins) {
  const items = rows.map((r) => `
    <article class="record" data-request-id="${r.id}">
      <header class="record-head">
        <div><code>${esc(r.ref)}</code> <strong>${esc(r.category_name || 'Uncategorised')}</strong> ${statusBadge(r.status)}</div>
        <span class="muted small">${esc(r.created_at)}</span>
      </header>
      <p class="record-question">${esc(r.question)}</p>
      <dl class="record-meta">
        <div><dt>Response method</dt><dd>${esc(r.response_method)}</dd></div>
        <div><dt>Contact</dt><dd>${esc([r.contact_name, r.contact_email, r.contact_phone].filter(Boolean).join(' · ') || 'Fully anonymous')}</dd></div>
        <div><dt>Assigned</dt><dd>${esc(r.assigned_name || 'Unassigned')}</dd></div>
      </dl>
      <form class="record-form" data-request-update>
        <div class="field-row">
          <div class="field"><label>Status</label>
            <select name="status">${['new', 'in-progress', 'replied', 'closed'].map((s) => `<option value="${s}"${r.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Assign to</label>
            <select name="assigned_to"><option value="">Unassigned</option>${admins.map((a) => `<option value="${a.id}"${r.assigned_to === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field"><label>Internal note</label><textarea name="admin_note" rows="2">${esc(r.admin_note)}</textarea></div>
        <div class="field"><label>Reply sent to client <span class="opt">(record only)</span></label><textarea name="reply_text" rows="2">${esc(r.reply_text)}</textarea></div>
        <div class="record-actions">
          <button class="btn btn-primary btn-sm" type="submit">Save</button>
          ${r.contact_email ? `<a class="btn btn-outline btn-sm" href="mailto:${esc(r.contact_email)}?subject=${encodeURIComponent('Re: your question ' + r.ref)}">Email client</a>` : ''}
          ${r.contact_phone ? `<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(String(r.contact_phone).replace(/\D/g, ''))}">WhatsApp client</a>` : ''}
          <span class="save-state small muted" data-save-state></span>
        </div>
      </form>
    </article>`).join('');
  return `<div class="admin-toolbar">
      <form class="filters" method="get" action="/admin/requests">
        <div class="field"><label for="status">Status</label>
          <select id="status" name="status">
            <option value="">All</option>${['new', 'in-progress', 'replied', 'closed'].map((s) => `<option value="${s}"${ctx.query.status === s ? ' selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field field-actions"><button class="btn btn-primary btn-sm" type="submit">Filter</button></div>
      </form>
    </div>
    <div class="records">${items || '<p class="empty">No requests match this filter.</p>'}</div>`;
}

function bookingsTable(ctx, rows) {
  const items = rows.map((b) => `
    <article class="record" data-booking-id="${b.id}">
      <header class="record-head">
        <div><code>${esc(b.ref)}</code> <strong>${esc(b.client_name)}</strong> ${statusBadge(b.status)}</div>
        <span class="muted small">booked ${esc(b.created_at)}</span>
      </header>
      <dl class="record-meta">
        <div><dt>Service</dt><dd>${esc(b.category_name || '—')}</dd></div>
        <div><dt>Counsellor</dt><dd>${esc(b.counselor_name || 'Next available')}</dd></div>
        <div><dt>When</dt><dd>${esc(b.session_date)} at ${esc(b.session_time)} WAT</dd></div>
        <div><dt>Format</dt><dd>${esc(b.format)} · ${esc(b.duration_min)} min</dd></div>
        <div><dt>Email</dt><dd><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></dd></div>
        <div><dt>Phone</dt><dd>${b.phone ? `<a href="https://wa.me/${esc(String(b.phone).replace(/\D/g, ''))}" target="_blank" rel="noopener">${esc(b.phone)}</a>` : '—'}</dd></div>
      </dl>
      ${b.notes ? `<p class="record-question">${esc(b.notes)}</p>` : ''}
      <form class="record-form" data-booking-update>
        <div class="field-row">
          <div class="field"><label>Status</label>
            <select name="status">${['pending', 'confirmed', 'completed', 'cancelled'].map((s) => `<option value="${s}"${b.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Internal note</label><input name="admin_note" value="${esc(b.admin_note)}"></div>
        </div>
        <div class="record-actions">
          <button class="btn btn-primary btn-sm" type="submit">Update</button>
          <span class="save-state small muted" data-save-state></span>
        </div>
      </form>
    </article>`).join('');
  return `<div class="records">${items || '<p class="empty">No bookings yet.</p>'}</div>`;
}

function counselorsPanel(ctx) {
  const { db } = require('../lib/db');
  const rows = db.prepare('SELECT * FROM counselors ORDER BY active DESC, position, id').all();
  const cats = ctx.categories;
  const list = rows.map((c) => `
    <article class="record" data-counselor-id="${c.id}">
      <header class="record-head">
        <div class="counselor-line"><img src="${esc(c.photo || '/assets/emblem.png')}" alt="" class="avatar"><strong>${esc(c.name)}</strong> ${c.active ? '<span class="badge badge-green">active</span>' : '<span class="badge badge-grey">hidden</span>'}</div>
        <span class="muted small">${esc(c.title)}</span>
      </header>
      <form class="record-form" data-counselor-update>
        <div class="field-row">
          <div class="field"><label>Name</label><input name="name" value="${esc(c.name)}" required></div>
          <div class="field"><label>Title / role</label><input name="title" value="${esc(c.title)}" required></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Role label</label><input name="role_label" value="${esc(c.role_label)}"></div>
          <div class="field"><label>Photo URL</label><input name="photo" value="${esc(c.photo || '')}"></div>
        </div>
        <div class="field"><label>Qualifications</label><input name="qualifications" value="${esc(c.qualifications)}"></div>
        <div class="field"><label>Short biography</label><textarea name="bio" rows="3">${esc(c.bio)}</textarea></div>
        <div class="field"><label>Counselling approach</label><textarea name="approach" rows="2">${esc(c.approach)}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Languages</label><input name="languages" value="${esc(c.languages)}"></div>
          <div class="field"><label>WhatsApp (optional)</label><input name="whatsapp" value="${esc(c.whatsapp || '')}" placeholder="+234..."></div>
        </div>
        <div class="field"><label>Specialties</label>
          <div class="checkbox-grid">${cats.map((cat) => `<label class="check"><input type="checkbox" name="specialties" value="${esc(cat.slug)}"${String(c.specialties).split(',').includes(cat.slug) ? ' checked' : ''}> ${esc(cat.name)}</label>`).join('')}</div>
        </div>
        <div class="field-row">
          <div class="field"><label>Formats</label>
            <div class="checkbox-row">${['online', 'telephone', 'in-person'].map((f) => `<label class="check"><input type="checkbox" name="formats" value="${f}"${String(c.formats).split(',').includes(f) ? ' checked' : ''}> ${f}</label>`).join('')}</div>
          </div>
          <div class="field"><label>Working days</label>
            <div class="checkbox-row">${[['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat']].map(([d, n]) => `<label class="check"><input type="checkbox" name="work_days" value="${d}"${String(c.work_days).split(',').includes(d) ? ' checked' : ''}> ${n}</label>`).join('')}</div>
          </div>
        </div>
        <div class="record-actions">
          <button class="btn btn-primary btn-sm" type="submit">Save changes</button>
          <button class="btn btn-ghost btn-sm" type="button" data-counselor-toggle="${c.id}" data-active="${c.active ? '0' : '1'}">${c.active ? 'Hide from site' : 'Show on site'}</button>
          <button class="btn btn-ghost btn-sm danger" type="button" data-counselor-delete="${c.id}">Delete</button>
          <span class="save-state small muted" data-save-state></span>
        </div>
      </form>
    </article>`).join('');

  return `
  <section class="panel">
    <div class="panel-head"><h2>Add a counsellor</h2></div>
    <form class="form record-form" data-counselor-create>
      <div class="form-error" data-form-error role="alert" hidden></div>
      <div class="field-row">
        <div class="field"><label>Name</label><input name="name" required></div>
        <div class="field"><label>Title / role</label><input name="title" required placeholder="e.g. Family Counsellor"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Qualifications</label><input name="qualifications"></div>
        <div class="field"><label>WhatsApp (optional)</label><input name="whatsapp" placeholder="+234..."></div>
      </div>
      <div class="field"><label>Short biography</label><textarea name="bio" rows="3"></textarea></div>
      <div class="field"><label>Specialties (slug list)</label><input name="specialties" value="${esc(cats[0].slug)}"></div>
      <button class="btn btn-primary btn-sm" type="submit">Create counsellor</button>
    </form>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>All counsellors (${rows.length})</h2></div>
    <div class="records">${list || '<p class="empty">No counsellors yet.</p>'}</div>
  </section>`;
}

function outboxPanel(ctx) {
  const { db } = require('../lib/db');
  const rows = db.prepare('SELECT * FROM outbox ORDER BY id DESC LIMIT 100').all();
  const body = rows.map((r) => `
    <tr>
      <td><code>#${r.id}</code></td>
      <td>${esc(r.channel)}</td>
      <td>${esc(r.recipient)}</td>
      <td class="trunc">${esc(r.subject || r.body.slice(0, 60))}</td>
      <td>${statusBadge(r.status)}${r.error ? `<br><span class="small muted">${esc(r.error)}</span>` : ''}</td>
      <td class="small">${esc(r.created_at)}</td>
      <td>${r.status !== 'sent' ? `<button class="btn btn-ghost btn-sm" data-outbox-retry="${r.id}">Retry</button>` : ''}</td>
    </tr>`).join('');
  return `
  <section class="panel">
    <div class="panel-head"><h2>Notification log</h2>
      <div><button class="btn btn-outline btn-sm" data-outbox-retry-all>Retry all</button></div>
    </div>
    <p class="muted">Everything the site attempted to send by email or WhatsApp. Rows labelled <span class="badge badge-grey">no-transport</span> mean no credentials are configured yet — add them in your environment, then retry.</p>
    <table class="admin-table"><thead><tr><th>#</th><th>Channel</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Created</th><th></th></tr></thead>
    <tbody>${body || '<tr><td colspan="7" class="empty">Nothing sent yet.</td></tr>'}</tbody></table>
  </section>`;
}

function settingsPanel(ctx, transports) {
  const s = ctx.settings;
  return `
  <section class="panel">
    <div class="panel-head"><h2>Website contact details</h2></div>
    <form class="form record-form" data-settings-form>
      <div class="form-error" data-form-error role="alert" hidden></div>
      <div class="field-row">
        <div class="field"><label>Organisation name</label><input name="site_name" value="${esc(s.site_name)}"></div>
        <div class="field"><label>Public email</label><input name="email" type="email" value="${esc(s.email)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Phone</label><input name="phone" value="${esc(s.phone)}"></div>
        <div class="field"><label>WhatsApp number</label><input name="whatsapp" value="${esc(s.whatsapp)}" placeholder="+234..."></div>
      </div>
      <div class="field"><label>Address</label><input name="address" value="${esc(s.address)}"></div>
      <div class="field"><label>Opening hours</label><input name="hours" value="${esc(s.hours)}"></div>
      <button class="btn btn-primary btn-sm" type="submit">Save settings</button>
      <span class="save-state small muted" data-save-state></span>
    </form>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Your password</h2></div>
    <form class="form record-form" data-password-form>
      <div class="form-error" data-form-error role="alert" hidden></div>
      <div class="field-row">
        <div class="field"><label>New password</label><input name="new_password" type="password" minlength="10" required></div>
        <div class="field"><label>Confirm new password</label><input name="confirm" type="password" minlength="10" required></div>
      </div>
      <button class="btn btn-primary btn-sm" type="submit">Update password</button>
      <span class="save-state small muted" data-save-state></span>
    </form>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Integrations</h2></div>
    <ul class="ticks">
      <li>${transports.smtp ? '✅' : '⬜'} SMTP email (Gmail app password works with smtp.gmail.com:465)</li>
      <li>${transports.resend ? '✅' : '⬜'} Resend HTTP email API</li>
      <li>${transports.whatsapp ? '✅' : '⬜'} WhatsApp Cloud API notifications</li>
    </ul>
    <p class="muted">Credentials are read from environment variables only and are never stored in the database or shown in the browser.</p>
  </section>`;
}

module.exports = {
  login, dashboard, overview, requestsTable, bookingsTable, statusBadge,
  counselorsPanel, outboxPanel, settingsPanel,
};
