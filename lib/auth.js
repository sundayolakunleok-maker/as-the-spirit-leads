'use strict';
const crypto = require('node:crypto');
const { db } = require('./db');

const SESSION_COOKIE = 'asl_session';
const CSRF_COOKIE = 'asl_csrf';
const SESSION_TTL_SEC = 60 * 60 * 8;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function createSession(adminId) {
  const id = crypto.randomBytes(32).toString('hex');
  const csrf = crypto.randomBytes(24).toString('hex');
  const expires = Date.now() + SESSION_TTL_SEC * 1000;
  db.prepare('INSERT INTO sessions (id, admin_id, csrf, expires_at) VALUES (?,?,?,?)')
    .run(id, adminId, csrf, expires);
  return { id, csrf, expires };
}

function destroySession(id) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

function sessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const id = cookies[SESSION_COOKIE];
  if (!id) return null;
  const row = db.prepare(`SELECT s.id, s.csrf, s.expires_at, a.id AS admin_id, a.email, a.name, a.role
    FROM sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.id = ? AND a.active = 1`).get(id);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    destroySession(id);
    return null;
  }
  return {
    id: row.id,
    csrf: row.csrf,
    admin: { id: row.admin_id, email: row.email, name: row.name, role: row.role },
  };
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookie(name, value, opts = {}) {
  const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (opts.maxAge !== undefined) bits.push(`Max-Age=${opts.maxAge}`);
  if (opts.secure) bits.push('Secure');
  return bits.join('; ');
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Simple fixed-window rate limiter backed by SQLite (survives restarts).
function rateLimit(key, limit, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare('SELECT count, window_start FROM login_attempts WHERE key = ?').get(key);
  if (!row || now - row.window_start > windowSec) {
    db.prepare('INSERT INTO login_attempts (key,count,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start')
      .run(key, now);
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (row.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: windowSec - (now - row.window_start) };
  }
  db.prepare('UPDATE login_attempts SET count = count + 1 WHERE key = ?').run(key);
  return { allowed: true, remaining: limit - row.count - 1, retryAfter: 0 };
}

function resetRateLimit(key) {
  db.prepare('DELETE FROM login_attempts WHERE key = ?').run(key);
}

function requireAdmin(session, roles = ['admin', 'counselor']) {
  if (!session) return { ok: false, status: 401, error: 'Sign in required.' };
  if (!roles.includes(session.admin.role)) return { ok: false, status: 403, error: 'Not permitted.' };
  return { ok: true };
}

function checkCsrf(req, session) {
  const token = req.headers['x-csrf-token'] || '';
  if (!session) return false;
  const a = Buffer.from(String(token));
  const b = Buffer.from(session.csrf);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  SESSION_COOKIE, CSRF_COOKIE, SESSION_TTL_SEC,
  hashPassword, verifyPassword, createSession, destroySession, sessionFromRequest,
  parseCookies, cookie, clearCookie, rateLimit, resetRateLimit, requireAdmin, checkCsrf,
};
