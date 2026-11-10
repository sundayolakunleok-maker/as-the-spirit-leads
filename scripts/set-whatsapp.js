'use strict';
const { db, setSetting } = require('../lib/db');

const numbers = {
  'okegbemi-eniolaye-aishat': '+2347062789867',
  'okegbemi-sunday-olakunle': '+2347035672890',
};

for (const [slug, wa] of Object.entries(numbers)) {
  const info = db.prepare('UPDATE counselors SET whatsapp = ? WHERE slug = ?').run(wa, slug);
  console.log(slug, 'updated rows:', info.changes, '->', wa);
}
// Organisation WhatsApp uses the founder's line for general enquiries.
setSetting('whatsapp', '+2347062789867');
console.log('organisation whatsapp ->', db.prepare("SELECT value FROM settings WHERE key='whatsapp'").get().value);
console.log(db.prepare('SELECT slug, name, whatsapp FROM counselors').all());
