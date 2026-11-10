'use strict';
// Load every module once to catch syntax/require errors early.
const modules = [
  '../lib/db', '../lib/auth', '../lib/validate', '../lib/notify', '../lib/api', '../lib/api-admin',
  '../views/layout', '../views/home', '../views/about', '../views/services', '../views/counselors',
  '../views/forms', '../views/info', '../views/admin', '../server',
];
for (const m of modules) {
  require(m);
  console.log('ok', m);
}
const { db } = require('../lib/db');
console.log('categories:', db.prepare('SELECT COUNT(*) AS n FROM categories').get().n);
console.log('counselors:', db.prepare('SELECT COUNT(*) AS n FROM counselors').get().n);
console.log('admins:', db.prepare('SELECT COUNT(*) AS n FROM admins').get().n);
