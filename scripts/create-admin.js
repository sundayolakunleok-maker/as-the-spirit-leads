'use strict';
/**
 * Create or update an administrator / counsellor account.
 * Usage: node scripts/create-admin.js "Name" email@example.com "password" [role]
 * Roles: admin (default) or counselor
 */
const { db } = require('../lib/db');
const { hashPassword } = require('../lib/auth');

const [name, email, password, role = 'admin'] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('Usage: node scripts/create-admin.js "Full Name" email@example.com "password" [admin|counselor]');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}
if (!['admin', 'counselor'].includes(role)) {
  console.error('Role must be admin or counselor.');
  process.exit(1);
}

const normalised = email.trim().toLowerCase();
const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(normalised);
if (existing) {
  db.prepare('UPDATE admins SET name = ?, password_hash = ?, role = ?, active = 1 WHERE id = ?')
    .run(name, hashPassword(password), role, existing.id);
  console.log(`Updated account for ${normalised} (${role}).`);
} else {
  db.prepare('INSERT INTO admins (name, email, password_hash, role) VALUES (?,?,?,?)')
    .run(name, normalised, hashPassword(password), role);
  console.log(`Created ${role} account for ${normalised}.`);
}
