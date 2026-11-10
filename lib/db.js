'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
// On Vercel the deployment directory is read-only; only /tmp is writable.
// Keep the same app running there against a throwaway database file.
const SERVERLESS = Boolean(process.env.VERCEL);
if (!SERVERLESS && !fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = process.env.DB_FILE ||
  (SERVERLESS ? path.join('/tmp', 'asthespiritleads.db') : path.join(DATA_DIR, 'asthespiritleads.db'));

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_desc TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS counselors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  photo TEXT,
  qualifications TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  approach TEXT NOT NULL DEFAULT '',
  languages TEXT NOT NULL DEFAULT 'English',
  specialties TEXT NOT NULL DEFAULT '',
  formats TEXT NOT NULL DEFAULT 'online,telephone,in-person',
  work_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
  whatsapp TEXT,
  email TEXT,
  role_label TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES categories(id),
  counselor_id INTEGER REFERENCES counselors(id),
  format TEXT NOT NULL,
  session_date TEXT NOT NULL,
  session_time TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 50,
  client_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_slot
  ON bookings(counselor_id, session_date, session_time)
  WHERE status IN ('pending','confirmed');

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES categories(id),
  question TEXT NOT NULL,
  response_method TEXT NOT NULL DEFAULT 'none',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to INTEGER REFERENCES admins(id),
  admin_note TEXT NOT NULL DEFAULT '',
  reply_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
`);

const CATEGORIES = [
  ['marriage-relationship', 'Marriage & Relationship', 'Premarital guidance, communication, conflict repair and relationship health.',
    'Whether you are preparing for marriage, navigating a difficult season, or rebuilding trust after a breach, we walk with couples and individuals through honest, structured conversations. Sessions help you name the real issue, hear one another, and build practical agreements you can keep.', 'rings'],
  ['family-parenting', 'Family & Parenting', 'Parenting strategy, family conflict, blended homes and household peace.',
    'Family life carries both joy and pressure. We support parents with age-appropriate discipline, teenagers and screen habits, blended-family adjustment, in-law tensions, and rebuilding warmth in the home.', 'home'],
  ['education-academic', 'Educational & Academic', 'Study skills, exam pressure, school choice and academic direction.',
    'From secondary school subject choices to university and postgraduate decisions, we help students and parents think clearly about ability, interest, and opportunity, and manage exam-related anxiety.', 'book'],
  ['career-professional', 'Career & Professional', 'Career direction, workplace pressure, promotion readiness and transitions.',
    'We help professionals make decisions about career change, workplace conflict, burn-out, business ownership, and the balance between ambition and family life.', 'briefcase'],
  ['personal-development', 'Personal Development & Life Guidance', 'Purpose, habits, confidence and personal growth.',
    'For anyone at a crossroads: clarifying values, building discipline, recovering confidence after setback, and setting goals that survive real life.', 'compass'],
  ['emotional-wellbeing', 'Emotional & Mental Well-being', 'Stress, anxiety, grief, low mood and emotional resilience.',
    'Confidential support for anxiety, low mood, grief and loss, trauma responses, anger, and the quiet exhaustion many people carry alone. Where specialist medical care is needed, we refer appropriately.', 'heart'],
  ['faith-based', 'Faith-based & Spiritual Counseling', 'Faith-integrated guidance for life decisions and spiritual growth.',
    'For clients who want their faith respected and integrated, we offer counsel that takes scripture seriously while remaining practical, confidential, and non-judgemental.', 'spark'],
  ['other-services', 'Other Counseling Services', 'Group sessions, organisations, schools and bespoke support.',
    'We also serve schools, churches, teams and organisations through workshops, group sessions and staff wellbeing support. Tell us what you need and we will design it with you.', 'users'],
];

const FOUNDER_PHOTO = 'https://images.example/placeholder';
const COUNSELORS = [
  {
    slug: 'okegbemi-eniolaye-aishat',
    name: 'Okegbemi Eniolaye Aishat',
    title: 'Founder & Lead Counsellor',
    photo: '/assets/founder.jpg',
    qualifications: 'B.Sc. Biochemistry · Diploma in Nursing Assistant · M.Sc. Public Health',
    bio: 'Eniolaye founded As the Spirit Leads to make calm, confidential, professional counsel accessible to individuals and families. She leads the practice, supervises intake, and personally handles marriage, family, and personal development cases.',
    approach: 'Warm, structured and solution-focused. Sessions begin with listening, then agree one or two changes worth trying before the next meeting.',
    languages: 'English, Yoruba',
    specialties: 'marriage-relationship,family-parenting,personal-development,faith-based',
    formats: 'online,telephone,in-person',
    work_days: '1,2,3,4,5',
    whatsapp: '+2347062789867',
    role_label: 'Founder',
    position: 1,
  },
  {
    slug: 'okegbemi-sunday-olakunle',
    name: 'Okegbemi Sunday Olakunle',
    title: 'Co-Founder & Counselling Director',
    photo: '/assets/cofounder.jpg',
    qualifications: 'B.Tech. Statistics · M.Sc. Information Technology',
    bio: 'Sunday co-founded the practice and oversees counsellor standards, bookings and client care. He works with students, professionals and families navigating decisions, pressure and transition.',
    approach: 'Practical and direct, with respect for each client\'s faith, culture and pace. Emphasis on clear plans, measurable next steps and follow-up.',
    languages: 'English, Yoruba',
    specialties: 'career-professional,education-academic,emotional-wellbeing,other-services',
    formats: 'online,telephone,in-person',
    work_days: '1,2,3,4,5',
    whatsapp: '+2347035672890',
    role_label: 'Co-Founder',
    position: 2,
  },
];

function seed() {
  const catCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (!catCount) {
    const ins = db.prepare('INSERT INTO categories (slug,name,short_desc,description,icon,position) VALUES (?,?,?,?,?,?)');
    CATEGORIES.forEach((c, i) => ins.run(c[0], c[1], c[2], c[3], c[4], i));
  }
  const cCount = db.prepare('SELECT COUNT(*) AS n FROM counselors').get().n;
  if (!cCount) {
    const ins = db.prepare(`INSERT INTO counselors
      (slug,name,title,photo,qualifications,bio,approach,languages,specialties,formats,work_days,whatsapp,role_label,position)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const c of COUNSELORS) {
      ins.run(c.slug, c.name, c.title, c.photo, c.qualifications, c.bio, c.approach, c.languages,
        c.specialties, c.formats, c.work_days, c.whatsapp, c.role_label, c.position);
    }
  }
  const defaults = {
    site_name: 'As the Spirit Leads',
    tagline: 'Confidential Christian counselling for individuals, couples and families.',
    phone: '',
    whatsapp: '',
    email: 'asthespiritleads@gmail.com',
    address: 'Lagos, Nigeria',
    hours: 'Monday to Friday, 9:00am - 5:00pm (WAT)',
  };
  const insS = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
  for (const [k, v] of Object.entries(defaults)) insS.run(k, v);
}

seed();

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

module.exports = { db, getSetting, setSetting, DB_FILE };
