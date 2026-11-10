# As the Spirit Leads — Counselling & Advisory Website

A complete, working counselling platform: public website, anonymous question submission,
session booking with real availability rules, a counsellor directory, and a password-protected
admin dashboard. Built with **zero npm dependencies** — it runs on Node.js alone.

Colours follow the brief: deep blue, white, and restrained red accents.

---

## 1. What is included

| Area | Status |
|---|---|
| Home, About, Services (8 categories with detail pages) | Live pages |
| Counsellor directory with specialty filter, search and full profiles | Live, driven by the database |
| Anonymous question form (no name/email required) + reference number | Works, rate-limited, spam honeypot |
| Session booking: category → counsellor → date → time → details → confirmation | Works, prevents double booking |
| Availability in West Africa Time (WAT, UTC+1), weekday rules per counsellor | Works |
| Admin dashboard (overview, requests, bookings, counsellors, notification log, settings) | Works, role-based |
| Email notifications to the organisation and to clients | Works when SMTP or Resend credentials are set |
| WhatsApp: click-to-chat links + Cloud API notifications | Links work; API notifications need credentials |
| Privacy policy, emergency/disclaimer page, SEO metadata, sitemap, robots.txt | Included |
| Security: HTTPS-ready headers, scrypt password hashing, sessions, CSRF, rate limits, audit of outbound mail | Included |

No placeholder forms: every form posts to the API, is validated server-side, is stored in SQLite,
and triggers real notification records that the admin can see and retry.

---

## 2. Run it

Requirements: **Node.js 22.5+** (built and tested on Node 24). Nothing else — no `npm install`.

```bat
cd "C:\Users\MADAM ENIOLA\Desktop\asthespiritlead\site"
start.bat
```

The site opens at <http://127.0.0.1:3000> and the dashboard at <http://127.0.0.1:3000/admin>.

`start.bat` loads `.env` (if present) and starts the server. To stop it, close the window
or press `Ctrl + C`.

### Admin sign-in (already created)

```
URL:      http://127.0.0.1:3000/admin
Email:    asthespiritleads@gmail.com
Password: SpiritLeads#2026
```

**Change this password immediately** — sign in, open *Settings*, and set a new one.
Create extra staff accounts from the command line:

```bat
node scripts/create-admin.js "Counsellor Name" email@example.com "a-long-password" counselor
node scripts/create-admin.js "Admin Name" admin@example.com "a-long-password" admin
```

Roles: `admin` sees everything; `counselor` sees only requests assigned to them.

---

## 3. Project layout

```
site/
  server.js              HTTP server, routing, static files, security headers
  lib/db.js              SQLite schema + seed data (8 categories, 2 founders)
  lib/auth.js            password hashing, sessions, CSRF, rate limiting
  lib/validate.js        input validation and reference numbers
  lib/notify.js          email (SMTP / Resend) + WhatsApp Cloud API + outbox queue
  lib/api.js             public API: requests, bookings, availability, login
  lib/api-admin.js       admin API: requests, bookings, counsellors, settings, outbox
  views/                 server-rendered pages (home, about, services, counsellors,
                         booking, anonymous form, legal, admin dashboard)
  public/css             styles.css + admin.css
  public/js              site.js (forms, slots, summary) + admin.js (dashboard)
  public/assets          founder.jpg, cofounder.jpg, emblem.png
  scripts/               start.js, create-admin.js, e2e.js, smoke.js
  data/                  asthespiritleads.db (created automatically)
  .env.example           copy to .env to enable email / WhatsApp
```

Database tables: `categories`, `counselors`, `bookings`, `requests`, `admins`, `sessions`,
`outbox`, `settings`, `login_attempts`. A partial unique index on
`(counselor_id, session_date, session_time)` makes double booking impossible at database level.

---

## 4. Email and WhatsApp setup

Copy `.env.example` to `.env` and fill what you have. Without credentials, every notification is
still recorded in the **Notification log** (marked `no-transport`) and can be retried later after
you add them — nothing is silently lost.

**Gmail (recommended for this project)**

1. Turn on 2-Step Verification for `asthespiritleads@gmail.com`.
2. Google Account → Security → App passwords → create one for "Mail".
3. Put it in `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=asthespiritleads@gmail.com
SMTP_PASS=the16charapppassword
SMTP_FROM=As the Spirit Leads <asthespiritleads@gmail.com>
```

**WhatsApp**

- Click-to-chat links work as soon as you set the organisation's WhatsApp number in
  *Admin → Settings* (and optionally per counsellor in *Admin → Counsellors*).
- Automated WhatsApp notifications require a Meta WhatsApp Business account:
  set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` in `.env`. Until then, WhatsApp rows in the
  notification log show `no-transport`.

---

## 5. Testing

```bat
node --no-warnings scripts/e2e.js
```

Runs about 40 automated checks against a temporary database on a real HTTP port: every public page,
CSRF rejection, anonymous submission + storage + notification record, availability, booking,
double-booking rejection (409), consent and email validation, admin login (wrong and right
password), dashboard access control, request/booking updates, counsellor create → profile → delete,
settings change reflected on the public site, outbox page, and public-form rate limiting.

```bat
node --no-warnings scripts/smoke.js
```

Loads every module and prints row counts.

---

## 6. Deployment

Any host that runs Node.js works: a small VPS, Render, Railway, Fly.io, or a cPanel Node app.
Static-only hosting (Netlify/GitHub Pages) will **not** work because bookings need the server.

1. Copy the `site` folder to the server (do not copy `data/` if you want a clean start).
2. Set `PORT`, `HOST=0.0.0.0`, and the email/WhatsApp variables as environment variables.
3. Start with `node scripts/start.js` (or `node server.js`).
4. Put HTTPS in front (Caddy, Nginx, or the platform's TLS). The app already sends HSTS and
   sets the session cookie `Secure` when it sees `X-Forwarded-Proto: https`.
5. Back up `data/asthespiritleads.db` (plus `-wal`/`-shm`) on a schedule — that file is the
   whole database.
6. Replace the seeded admin password and confirm the organisation email/WhatsApp in Settings.

---

## 7. Before launch — decisions only you can make

1. **Professional credentials.** The founder and co-founder profiles use the titles and
   qualifications you supplied. Replace them with exact certification wording, and add the
   remaining counsellors from *Admin → Counsellors* (or send me their details).
2. **Fees.** No prices are published. Add a fee note per category if you want one shown.
3. **WhatsApp number** for the organisation, and per-counsellor numbers where authorised.
4. **Gmail app password** so clients receive confirmations.
5. **Legal review** of the privacy policy and emergency page by a Nigerian practitioner.
6. **Data retention**: the policy states 24 months for bookings and 12 months for questions;
   confirm this suits you. Nothing deletes automatically yet — deletion is manual via support.
7. **Crisis cover**: the site states clearly that it is not a 24/7 crisis service. Add local
   support-line numbers if you have them.

---

## 8. Limitations, stated honestly

- Payments are not integrated (no fees are charged online).
- Automatic reminders before a session are not scheduled yet; confirmations are sent on
  booking and on status change.
- The WhatsApp Cloud API path needs an approved Meta template for messages sent outside a
  24-hour customer window; the site sends plain text messages, which works for replies inside
  that window.
- No automatic data-retention job runs; the policy describes manual retention.
- The seeded founder bios are written from the brief and should be reviewed by them.
