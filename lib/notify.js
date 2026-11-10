'use strict';
const tls = require('node:tls');
const net = require('node:net');
const { db, getSetting } = require('./db');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const RESEND_KEY = process.env.RESEND_API_KEY || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';

function queue(channel, recipient, subject, body) {
  const info = db.prepare('INSERT INTO outbox (channel,recipient,subject,body) VALUES (?,?,?,?)')
    .run(channel, recipient, subject, body);
  const id = Number(info.lastInsertRowid);
  deliver(id).catch(() => {});
  return id;
}

async function deliver(id) {
  const row = db.prepare('SELECT * FROM outbox WHERE id = ?').get(id);
  if (!row || row.status === 'sent') return row;
  try {
    if (row.channel === 'email') {
      if (!SMTP_HOST && !RESEND_KEY) {
        db.prepare("UPDATE outbox SET status='no-transport', error=? WHERE id=?")
          .run('No email transport configured (set SMTP_HOST or RESEND_API_KEY).', id);
        return;
      }
      if (SMTP_HOST) {
        await sendSmtp({ to: row.recipient, subject: row.subject, text: row.body });
      } else {
        await sendResend({ to: row.recipient, subject: row.subject, text: row.body });
      }
    } else if (row.channel === 'whatsapp') {
      if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        db.prepare("UPDATE outbox SET status='no-transport', error=? WHERE id=?")
          .run('WhatsApp Cloud API not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID).', id);
        return;
      }
      await sendWhatsApp(row.recipient, row.body);
    } else {
      db.prepare("UPDATE outbox SET status='failed', error=? WHERE id=?").run('Unknown channel', id);
      return;
    }
    db.prepare("UPDATE outbox SET status='sent', sent_at=datetime('now'), error='' WHERE id=?").run(id);
  } catch (err) {
    db.prepare("UPDATE outbox SET status='failed', error=?, created_at=created_at WHERE id=?")
      .run(String(err && err.message ? err.message : err).slice(0, 500), id);
  }
}

function sendResend({ to, subject, text }) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: SMTP_FROM || 'As the Spirit Leads <noreply@asthespiritleads.com>', to: [to], subject, text }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  });
}

function sendWhatsApp(to, text) {
  return fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: String(to).replace(/\D/g, ''), type: 'text', text: { body: text } }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
  });
}

// Minimal SMTP client: implicit TLS (465) or STARTTLS (587).
function sendSmtp({ to, subject, text }) {
  return new Promise((resolve, reject) => {
    const implicit = SMTP_PORT === 465;
    let socket = implicit
      ? tls.connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST })
      : net.connect({ host: SMTP_HOST, port: SMTP_PORT });
    let buffer = '';
    let step = 0;
    const steps = [];
    let settled = false;

    function finish(err) {
      if (settled) return;
      settled = true;
      try { socket.end(); } catch { /* ignore */ }
      err ? reject(err) : resolve();
    }
    const timer = setTimeout(() => finish(new Error('SMTP timeout')), 20000);
    timer.unref?.();

    const auth = Buffer.from(`\u0000${SMTP_USER}\u0000${SMTP_PASS}`).toString('base64');
    const headers = [
      `From: ${SMTP_FROM}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      `Date: ${new Date().toUTCString()}`,
    ].join('\r\n');
    const dataBody = `${headers}\r\n\r\n${text}\r\n.`;

    steps.push(() => socket.write('EHLO asthespiritleads.local\r\n'));
    if (!implicit) {
      steps.push(() => socket.write('STARTTLS\r\n'));
    }
    steps.push(() => socket.write('AUTH LOGIN\r\n'));
    steps.push(() => socket.write(Buffer.from(SMTP_USER).toString('base64') + '\r\n'));
    steps.push(() => socket.write(Buffer.from(SMTP_PASS).toString('base64') + '\r\n'));
    steps.push(() => socket.write(`MAIL FROM:<${SMTP_FROM}>\r\n`));
    steps.push(() => socket.write(`RCPT TO:<${to}>\r\n`));
    steps.push(() => socket.write('DATA\r\n'));
    steps.push(() => socket.write(dataBody + '\r\n'));
    steps.push(() => socket.write('QUIT\r\n'));

    function onLine(line) {
      if (/^[45]\d\d/.test(line)) {
        // 5xx always fatal. 4xx during greeting also fatal for us.
        if (/^5/.test(line)) return finish(new Error(`SMTP: ${line}`));
        if (step === 0) return finish(new Error(`SMTP: ${line}`));
      }
      if (step === 1 && !implicit) {
        socket = tls.connect({ socket, servername: SMTP_HOST });
        socket.on('data', onData);
        socket.on('error', finish);
        socket.once('secureConnect', () => {
          step = 2;
          socket.write('EHLO asthespiritleads.local\r\n');
        });
        return;
      }
      const fn = steps[step];
      step += 1;
      if (fn) fn();
      else finish();
    }

    function onData(chunk) {
      buffer += chunk.toString('utf8');
      let idx;
      while ((idx = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        // multi-line replies: "250-..." then "250 ..."
        if (/^\d{3}-/.test(line)) continue;
        onLine(line);
        if (settled) return;
      }
    }

    socket.on('data', onData);
    socket.on('error', finish);
    socket.on('close', () => { if (!settled) finish(new Error('SMTP connection closed')); });
    if (implicit) socket.once('secureConnect', () => { step = 0; steps[0](); });
  });
}

function whatsappLink(number, message) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

function orgRecipients() {
  const emailTo = getSetting('email', 'asthespiritleads@gmail.com');
  const waTo = getSetting('whatsapp', '');
  return { emailTo, waTo };
}

function notifyOrg(subject, body) {
  const { emailTo, waTo } = orgRecipients();
  if (emailTo) queue('email', emailTo, subject, body);
  if (waTo) queue('whatsapp', waTo, '', body.slice(0, 900));
}

function flushOutbox(limit = 20) {
  const rows = db.prepare("SELECT id FROM outbox WHERE status IN ('queued','failed') ORDER BY id LIMIT ?").all(limit);
  return Promise.all(rows.map((r) => deliver(r.id)));
}

module.exports = {
  queue, deliver, flushOutbox, notifyOrg, whatsappLink,
  transports: () => ({
    smtp: Boolean(SMTP_HOST),
    resend: Boolean(RESEND_KEY),
    whatsapp: Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID),
  }),
};
