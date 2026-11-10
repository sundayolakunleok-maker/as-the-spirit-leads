'use strict';
// Remove smoke-test records created during browser verification.
const { db } = require('../lib/db');
const b = db.prepare("DELETE FROM bookings WHERE email LIKE '%@example.com'").run();
const r = db.prepare("DELETE FROM requests WHERE question LIKE 'Rate limit probe%' OR question LIKE '%argue about money every week%'").run();
const o = db.prepare("DELETE FROM outbox WHERE recipient LIKE '%@example.com'").run();
db.prepare('DELETE FROM login_attempts').run();
console.log('bookings removed:', b.changes, 'requests removed:', r.changes, 'outbox removed:', o.changes);
console.log('bookings remaining:', db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n);
console.log('requests remaining:', db.prepare('SELECT COUNT(*) AS n FROM requests').get().n);
