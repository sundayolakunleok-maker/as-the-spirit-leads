'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, getSetting } = require('./lib/db');
const { CSRF_COOKIE, sessionFromRequest, cookie, clearCookie, parseCookies } = require('./lib/auth');
const api = require('./lib/api');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function settingsAll() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY position, id').all();
}

function getCounselors() {
  return db.prepare('SELECT * FROM counselors WHERE active = 1 ORDER BY position, id').all();
}

function baseCtx(req, extra = {}) {
  const session = req.session || null;
  const settings = settingsAll();
  const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
  const host = req.headers.host || `localhost:${PORT}`;
  let csrf = '';
  if (session) {
    csrf = session.csrf;
  } else {
    const existing = parseCookies(req.headers.cookie || '')[CSRF_COOKIE];
    csrf = existing || crypto.randomBytes(24).toString('hex');
    req.newCsrf = existing ? null : csrf;
  }
  return {
    path: req.path,
    query: req.query,
    origin: `${proto}://${host}`,
    session,
    settings,
    categories: getCategories(),
    counselors: getCounselors(),
    csrf,
    ...extra,
  };
}

function send(res, status, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, {
    'Content-Length': buf.length,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    ...headers,
  });
  res.end(buf);
}

function sendHtml(req, res, status, html, extraHeaders = {}) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders };
  if (req.newCsrf) {
    headers['Set-Cookie'] = [cookie(CSRF_COOKIE, req.newCsrf, { maxAge: 60 * 60 * 12 })];
  }
  send(res, status, html, headers);
}

function securityHeaders() {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "script-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join('; '),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

function serveStatic(req, res, urlPath) {
  const isAsset = urlPath.startsWith('/assets/');
  const root = isAsset ? ASSETS_DIR : PUBLIC_DIR;
  const rel = isAsset ? urlPath.replace('/assets/', '') : urlPath.replace(/^\//, '');
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(root, safe);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const data = fs.readFileSync(file);
  const etag = `"${crypto.createHash('sha1').update(data).digest('hex').slice(0, 16)}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag });
    res.end();
    return true;
  }
  send(res, 200, data, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': isAsset ? 'public, max-age=604800' : 'no-cache',
    ETag: etag,
    ...securityHeaders(),
  });
  return true;
}

function readBody(req, limit = 128 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Payload too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const type = req.headers['content-type'] || '';
      if (type.includes('application/json')) {
        try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
      } else if (type.includes('application/x-www-form-urlencoded')) {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
      } else {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const VIEWS = () => ({
  home: require('./views/home').home,
  about: require('./views/about').about,
  services: require('./views/services'),
  counselors: require('./views/counselors'),
  forms: require('./views/forms'),
  info: require('./views/info'),
  admin: require('./views/admin'),
});

async function handlePage(req, res, ctx) {
  const views = VIEWS();
  const p = req.path;
  const session = req.session;
  const q = req.query;

  // ---- admin ----
  if (p === '/admin' || p.startsWith('/admin/')) {
    if (!session) {
      return sendHtml(req, res, 200, views.admin.login(ctx));
    }
    const section = p === '/admin' ? 'overview' : p.replace('/admin/', '').split('/')[0];
    const allowed = ['overview', 'requests', 'bookings', 'counselors', 'outbox', 'settings'];
    const active = allowed.includes(section) ? section : 'overview';
    const stats = api.adminStats(session.admin, ctx);
    let content = '';
    if (active === 'overview') {
      content = views.admin.overview(ctx, {
        requests: api.listRequests(session.admin, {}).slice(0, 6),
        bookings: api.listBookings(session.admin).slice(0, 6),
        stats,
        transports: require('./lib/notify').transports(),
      });
    } else if (active === 'requests') {
      content = views.admin.requestsTable(ctx, api.listRequests(session.admin, { status: q.status }), api.listAdmins());
    } else if (active === 'bookings') {
      content = views.admin.bookingsTable(ctx, api.listBookings(session.admin, { status: q.status }));
    } else if (active === 'counselors') {
      content = views.admin.counselorsPanel(ctx);
    } else if (active === 'outbox') {
      content = views.admin.outboxPanel(ctx);
    } else if (active === 'settings') {
      content = views.admin.settingsPanel(ctx, require('./lib/notify').transports());
    }
    return sendHtml(req, res, 200, views.admin.dashboard(ctx, { active, content, admin: session.admin, csrf: session.csrf, stats }));
  }

  if (p === '/') return sendHtml(req, res, 200, views.home(ctx));
  if (p === '/about') return sendHtml(req, res, 200, views.about(ctx));
  if (p === '/services') return sendHtml(req, res, 200, views.services.services(ctx));
  if (p.startsWith('/services/')) {
    const slug = decodeURIComponent(p.slice('/services/'.length));
    const cat = ctx.categories.find((c) => c.slug === slug);
    if (!cat) return sendHtml(req, res, 404, views.info.notFound(ctx));
    const team = ctx.counselors.filter((c) => String(c.specialties).split(',').includes(cat.slug));
    return sendHtml(req, res, 200, views.services.category(ctx, cat, { team }));
  }
  if (p === '/counselors') {
    const category = q.category || '';
    const term = (q.q || '').toLowerCase();
    let list = ctx.counselors;
    if (category) list = list.filter((c) => String(c.specialties).split(',').includes(category));
    if (term) list = list.filter((c) => `${c.name} ${c.languages} ${c.title}`.toLowerCase().includes(term));
    return sendHtml(req, res, 200, views.counselors.directory(ctx, { counselors: list, selectedCategory: category, q: q.q || '' }));
  }
  if (p.startsWith('/counselors/')) {
    const slug = decodeURIComponent(p.slice('/counselors/'.length));
    const c = ctx.counselors.find((x) => x.slug === slug);
    if (!c) return sendHtml(req, res, 404, views.info.notFound(ctx));
    const names = String(c.specialties).split(',').map((s) => (ctx.categories.find((x) => x.slug === s) || {}).name).filter(Boolean);
    const wa = c.whatsapp
      ? require('./lib/notify').whatsappLink(c.whatsapp, `Hello ${c.name.split(' ')[0]}, I found your profile on As the Spirit Leads and would like to book a session.`)
      : null;
    return sendHtml(req, res, 200, views.counselors.profile(ctx, { counselor: c, categoryNames: names, whatsapp: wa }));
  }
  if (p === '/book') {
    const tomorrow = new Date(Date.now() + 60 * 60 * 1000 + 86400000).toISOString().slice(0, 10);
    return sendHtml(req, res, 200, views.forms.book(ctx, {
      categories: ctx.categories, counselors: ctx.counselors,
      prefill: { category: q.category || '', counselor: q.counselor || '', tomorrow },
    }));
  }
  if (p === '/ask') {
    return sendHtml(req, res, 200, views.forms.ask(ctx, { categories: ctx.categories, prefill: { category: q.category || '' } }));
  }
  if (p === '/contact') return sendHtml(req, res, 200, views.info.contact(ctx));
  if (p === '/privacy') return sendHtml(req, res, 200, views.info.privacy(ctx));
  if (p === '/emergency') return sendHtml(req, res, 200, views.info.emergency(ctx));
  if (p === '/robots.txt') {
    return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${ctx.origin}/sitemap.xml\n`, { 'Content-Type': 'text/plain' });
  }
  if (p === '/sitemap.xml') {
    const urls = ['/', '/about', '/services', '/counselors', '/book', '/ask', '/contact', '/privacy', '/emergency',
      ...ctx.categories.map((c) => `/services/${c.slug}`),
      ...ctx.counselors.map((c) => `/counselors/${c.slug}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${ctx.origin}${u}</loc></url>`).join('')}</urlset>`;
    return send(res, 200, xml, { 'Content-Type': 'application/xml' });
  }
  return sendHtml(req, res, 404, views.info.notFound(ctx));
}

const handle = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    req.path = url.pathname.replace(/\/+$/, '') || '/';
    req.query = Object.fromEntries(url.searchParams);
    req.session = sessionFromRequest(req);

    for (const [k, v] of Object.entries(securityHeaders())) res.setHeader(k, v);

    if (req.path.startsWith('/api/')) {
      return await api.handle(req, res, { readBody, send, settingsAll, getCategories, getCounselors });
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (serveStatic(req, res, req.path)) return;
      const ctx = baseCtx(req);
      return await handlePage(req, res, ctx);
    }
    return send(res, 405, JSON.stringify({ error: 'Method not allowed' }), { 'Content-Type': 'application/json' });
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) send(res, err.status || 500, JSON.stringify({ error: 'Something went wrong.' }), { 'Content-Type': 'application/json' });
  }
};

const server = http.createServer(handle);

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`As the Spirit Leads running at http://${HOST}:${PORT}`);
  });
}

module.exports = { server, handle };
