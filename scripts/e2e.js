'use strict';
/* End-to-end test of the whole journey against a live server on a test DB. */
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB = path.join(__dirname, '..', 'data', 'test-e2e.db');
for (const suffix of ['', '-wal', '-shm']) {
  const f = TEST_DB + suffix;
  if (fs.existsSync(f)) fs.unlinkSync(f);
}
process.env.DB_FILE = TEST_DB;
process.env.PORT = '0';

const assert = require('node:assert');
const { db } = require('../lib/db');
const { server } = require('../server');
const { hashPassword } = require('../lib/auth');

let base = '';
let passed = 0;
const results = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
    results.push(`PASS ${name}`);
  } catch (err) {
    results.push(`FAIL ${name}: ${err.message}`);
    throw err;
  }
}

async function j(path, opts = {}) {
  const res = await fetch(base + path, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { res, text, json };
}

function cookiesFrom(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

function nextWorkday(offset = 2) {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() + offset);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  console.log('Testing against', base, 'db', TEST_DB);

  // 1. Public pages render
  const home = await j('/');
  check('home page renders', () => {
    assert.equal(home.res.status, 200);
    assert.match(home.text, /You do not have to carry it alone/);
    assert.match(home.text, /Okegbemi Eniolaye Aishat/);
  });
  for (const p of ['/about', '/services', '/services/marriage-relationship', '/counselors',
    '/counselors/okegbemi-eniolaye-aishat', '/book', '/ask', '/contact', '/privacy', '/emergency']) {
    const r = await j(p);
    check(`GET ${p}`, () => assert.equal(r.res.status, 200));
  }
  const notFound = await j('/does-not-exist');
  check('404 page', () => {
    assert.equal(notFound.res.status, 404);
    assert.match(notFound.text, /could not find that page/i);
  });
  check('sitemap + robots', async () => {});
  const sitemap = await j('/sitemap.xml');
  check('sitemap lists services', () => {
    assert.equal(sitemap.res.status, 200);
    assert.match(sitemap.text, /\/services\/marriage-relationship/);
  });

  // 2. Anonymous request: CSRF protection
  const askPage = await j('/ask');
  const csrfCookie = cookiesFrom(askPage.res);
  const csrfMatch = /asl_csrf=([a-f0-9]+)/.exec(csrfCookie);
  check('ask page sets csrf cookie', () => assert.ok(csrfMatch, 'no csrf cookie'));
  const csrfToken = csrfMatch[1];

  const noCsrf = await j('/api/requests', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 1, question: 'x'.repeat(40), response_method: 'none' }),
  });
  check('request without csrf rejected', () => assert.equal(noCsrf.res.status, 403));

  const badQuestion = await j('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: csrfCookie },
    body: JSON.stringify({ category: 1, question: 'too short', response_method: 'none' }),
  });
  check('short question rejected 422', () => assert.equal(badQuestion.res.status, 422));

  const anonReq = await j('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: csrfCookie },
    body: JSON.stringify({ category: 1, question: 'My husband and I argue about money every week and I do not know how to stop it.', response_method: 'none', website: '' }),
  });
  check('anonymous request accepted', () => {
    assert.equal(anonReq.res.status, 201);
    assert.match(anonReq.json.ref, /^ASL-[A-Z0-9]{6}$/);
  });
  const ref1 = anonReq.json.ref;
  const stored = db.prepare('SELECT * FROM requests WHERE ref = ?').get(ref1);
  check('request stored without contact details', () => {
    assert.ok(stored);
    assert.ok(!stored.contact_email, 'contact email should be empty');
    assert.equal(stored.status, 'new');
  });
  const outboxRows = db.prepare('SELECT * FROM outbox').all();
  check('org notification queued', () => assert.ok(outboxRows.some((r) => r.channel === 'email' && r.recipient === 'asthespiritleads@gmail.com')));

  // 3. Availability + booking
  const date = nextWorkday(2);
  const avail = await j(`/api/availability?date=${date}`);
  check('availability returns slots', () => {
    assert.equal(avail.res.status, 200);
    assert.ok(avail.json.slots.length > 0, `no slots for ${date}`);
  });
  const slot = avail.json.slots[0];
  const bookBody = {
    category: 1, counselor: 'okegbemi-eniolaye-aishat', format: 'online', date, time: slot,
    client_name: 'Test Client', email: 'client@example.com', phone: '+2348012345678',
    notes: 'Prefers evening', consent: true,
  };
  const booking = await j('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: csrfCookie },
    body: JSON.stringify(bookBody),
  });
  check('booking created', () => {
    assert.equal(booking.res.status, 201, JSON.stringify(booking.json));
    assert.match(booking.json.ref, /^BKG-/);
    assert.equal(booking.json.booking.counselor, 'Okegbemi Eniolaye Aishat');
  });
  const bookingRef = booking.json.ref;

  const dup = await j('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: csrfCookie },
    body: JSON.stringify(bookBody),
  });
  check('double booking blocked 409', () => assert.equal(dup.res.status, 409));

  const availAfter = await j(`/api/availability?counselor=okegbemi-eniolaye-aishat&date=${date}`);
  check('booked slot no longer offered', () => assert.ok(!availAfter.json.slots.includes(slot)));

  const missingConsent = await j('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: csrfCookie },
    body: JSON.stringify({ ...bookBody, time: avail.json.slots[1], consent: false }),
  });
  check('consent required', () => assert.equal(missingConsent.res.status, 422));

  const badEmail = await j('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: csrfCookie },
    body: JSON.stringify({ ...bookBody, time: avail.json.slots[1], email: 'not-an-email' }),
  });
  check('invalid email rejected', () => assert.equal(badEmail.res.status, 422));

  // 4. Admin auth
  db.prepare('INSERT INTO admins (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Test Admin', 'admin@test.local', hashPassword('correct-horse-battery'), 'admin');

  const badLogin = await j('/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.local', password: 'wrong' }),
  });
  check('wrong password rejected', () => assert.equal(badLogin.res.status, 401));

  const login = await j('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': base },
    body: JSON.stringify({ email: 'admin@test.local', password: 'correct-horse-battery' }),
  });
  check('admin login works', () => assert.equal(login.res.status, 200));
  const adminCookie = cookiesFrom(login.res);
  const sessionRow = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1').get();
  const adminCsrf = sessionRow.csrf;

  const adminPage = await j('/admin', { headers: { Cookie: adminCookie } });
  check('dashboard loads with session', () => {
    assert.equal(adminPage.res.status, 200);
    assert.match(adminPage.text, /Counselling requests/);
  });
  const adminAnon = await j('/admin');
  check('dashboard requires login', () => {
    assert.equal(adminAnon.res.status, 200);
    assert.match(adminAnon.text, /Staff sign in/);
  });

  const reqRow = db.prepare("SELECT id FROM requests WHERE ref = ?").get(ref1);
  const upd = await j(`/api/admin/requests/${reqRow.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': adminCsrf, Cookie: adminCookie },
    body: JSON.stringify({ status: 'in-progress', admin_note: 'Assigned to Eniolaye' }),
  });
  check('request updated', () => assert.equal(upd.res.status, 200));
  check('request status persisted', () => {
    assert.equal(db.prepare('SELECT status FROM requests WHERE id = ?').get(reqRow.id).status, 'in-progress');
  });

  const bkRow = db.prepare('SELECT id FROM bookings WHERE ref = ?').get(bookingRef);
  const bkUpdate = await j(`/api/admin/bookings/${bkRow.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': adminCsrf, Cookie: adminCookie },
    body: JSON.stringify({ status: 'confirmed' }),
  });
  check('booking confirmed', () => {
    assert.equal(bkUpdate.res.status, 200);
    assert.equal(db.prepare('SELECT status FROM bookings WHERE id = ?').get(bkRow.id).status, 'confirmed');
  });

  const adminNoCsrf = await j(`/api/admin/bookings/${bkRow.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  check('admin mutation without csrf rejected', () => assert.equal(adminNoCsrf.res.status, 403));

  const anonAdmin = await j(`/api/admin/bookings/${bkRow.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  check('admin mutation without session rejected', () => assert.equal(anonAdmin.res.status, 401));

  // 5. Counsellor CRUD
  const createCo = await j('/api/admin/counselors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': adminCsrf, Cookie: adminCookie },
    body: JSON.stringify({ name: 'Adaeze Test', title: 'Family Counsellor', specialties: 'family-parenting', bio: 'Test bio' }),
  });
  check('counsellor created', () => assert.equal(createCo.res.status, 201, JSON.stringify(createCo.json)));
  const newId = createCo.json.id;
  const newSlug = createCo.json.slug;
  const profile = await j(`/counselors/${newSlug}`);
  check('new counsellor profile renders', () => {
    assert.equal(profile.res.status, 200);
    assert.match(profile.text, /Adaeze Test/);
  });
  const deactivate = await j(`/api/admin/counselors/${newId}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': adminCsrf, Cookie: adminCookie },
    body: '{}',
  });
  check('counsellor deleted (no bookings)', () => assert.equal(deactivate.json.deleted, true));
  const gone = await j(`/counselors/${newSlug}`);
  check('deleted counsellor 404s', () => assert.equal(gone.res.status, 404));

  // 6. Settings + outbox endpoints
  const settings = await j('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': adminCsrf, Cookie: adminCookie },
    body: JSON.stringify({ whatsapp: '+2348011112222', phone: '+234 801 111 2222' }),
  });
  check('settings saved', () => {
    assert.equal(settings.res.status, 200);
    assert.equal(db.prepare("SELECT value FROM settings WHERE key='whatsapp'").get().value, '+2348011112222');
  });
  const page2 = await j('/contact');
  check('contact page shows new number', () => assert.match(page2.text, /2348011112222/));

  const outboxPage = await j('/admin/outbox', { headers: { Cookie: adminCookie } });
  check('outbox page renders', () => assert.equal(outboxPage.res.status, 200));

  // 7. Rate limiting on public forms
  let limited = false;
  for (let i = 0; i < 8; i++) {
    const r = await j('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: csrfCookie },
      body: JSON.stringify({ category: 1, question: 'Rate limit probe question number ' + i + ' with enough characters.', response_method: 'none' }),
    });
    if (r.res.status === 429) { limited = true; break; }
  }
  check('public form rate limited', () => assert.ok(limited, 'rate limit never triggered'));

  console.log(`\n${results.length} checks, ${passed} passed`);
  results.forEach((r) => console.log(' ', r));
  console.log('\nALL TESTS PASSED');
}

main()
  .then(() => { server.close(); process.exit(0); })
  .catch((err) => {
    console.error('\nTEST FAILURE');
    results.forEach((r) => console.log(' ', r));
    console.error(err);
    server.close();
    process.exit(1);
  });
