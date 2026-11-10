'use strict';
const { layout, esc, icon } = require('./layout');
const { pageHero } = require('./about');

function contact(ctx) {
  const s = ctx.settings;
  const wa = s.whatsapp ? `https://wa.me/${String(s.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent('Hello As the Spirit Leads, I would like to ask about counselling.')}` : '';
  const body = `
  ${pageHero({
    eyebrow: 'Contact',
    title: 'Talk to us',
    sub: 'Reach the team by email, phone or WhatsApp. For anything sensitive, we recommend the anonymous question form or a booked session.',
  })}
  <section class="section">
    <div class="wrap contact-grid">
      <div class="contact-list">
        <a class="contact-item" href="mailto:${esc(s.email)}">${icon('mail', 'ico')}<div><strong>Email</strong><span>${esc(s.email)}</span><small>Replies within one working day.</small></div></a>
        ${s.phone ? `<a class="contact-item" href="tel:${esc(String(s.phone).replace(/\s/g, ''))}">${icon('phone', 'ico')}<div><strong>Phone</strong><span>${esc(s.phone)}</span><small>${esc(s.hours)}</small></div></a>` : `<div class="contact-item">${icon('phone', 'ico')}<div><strong>Phone</strong><span>Number published soon</span><small>${esc(s.hours)}</small></div></div>`}
        ${wa ? `<a class="contact-item" href="${esc(wa)}" target="_blank" rel="noopener">${icon('chat', 'ico')}<div><strong>WhatsApp</strong><span>Start a chat</span><small>Fastest for booking questions.</small></div></a>` : ''}
        <div class="contact-item">${icon('pin', 'ico')}<div><strong>Office</strong><span>${esc(s.address)}</span><small>In-person sessions by appointment.</small></div></div>
        <div class="contact-item">${icon('clock', 'ico')}<div><strong>Hours</strong><span>${esc(s.hours)}</span><small>West Africa Time (UTC+1).</small></div></div>
      </div>
      <div class="card">
        <h3>Choose the right channel</h3>
        <ul class="ticks">
          <li>${icon('check', 'ico ico-xs')} <span><strong>Anonymous question</strong> — no name needed, <a href="/ask">ask here</a>.</span></li>
          <li>${icon('check', 'ico ico-xs')} <span><strong>Session booking</strong> — pick a time in two minutes, <a href="/book">book here</a>.</span></li>
          <li>${icon('check', 'ico ico-xs')} <span><strong>Counsellor application</strong> — email your credentials.</span></li>
          <li>${icon('check', 'ico ico-xs')} <span><strong>Organisations</strong> — request a workshop or staff support programme.</span></li>
        </ul>
        <p class="fine-print">Please do not send emergency requests through this website. See <a href="/emergency">emergency guidance</a>.</p>
      </div>
    </div>
  </section>`;
  return layout(ctx, { title: 'Contact', description: 'Contact As the Spirit Leads by email, phone or WhatsApp for counselling enquiries.', body });
}

function privacy(ctx) {
  const body = `
  ${pageHero({ eyebrow: 'Legal', title: 'Privacy & confidentiality', sub: 'How we handle what you share, in plain language.' })}
  <section class="section">
    <div class="wrap prose narrow">
      <h2>What we collect</h2>
      <p>For a booking: your name, email, optional phone number, the category you chose, format, date and time, and any note you add. For an anonymous question: your question and category only, plus whatever contact details you choose to add.</p>
      <p>We also keep standard server logs (IP address, user agent) for security and abuse prevention, retained for 30 days.</p>
      <h2>Why we collect it</h2>
      <p>To schedule and deliver counselling, to send confirmations and reminders, to respond to your question, and to keep a minimal record of service for continuity of care.</p>
      <h2>Who can see it</h2>
      <p>Only the counsellor handling your case and authorised administrative staff, on named accounts. We do not sell or rent data, and we do not use it for advertising.</p>
      <h2>How it is protected</h2>
      <p>Data is transmitted over HTTPS, passwords are stored as salted scrypt hashes, sessions are HTTP-only cookies that expire after 8 hours, and access to the admin dashboard is role-based.</p>
      <h2>Retention</h2>
      <p>Booking records are kept for 24 months after your last session, then anonymised. Anonymous questions are kept for 12 months. Outbox notification logs are kept for 90 days.</p>
      <h2>Your rights</h2>
      <p>You can request a copy of your records, correction, or deletion by writing to <a href="mailto:${esc(ctx.settings.email)}">${esc(ctx.settings.email)}</a>. We respond within 30 days. Deletion requests are honoured unless a legal obligation requires retention.</p>
      <h2>Cookies</h2>
      <p>We use one essential session cookie for staff sign-in and a CSRF token cookie for form security. No advertising or tracking cookies are used.</p>
      <h2>Consent</h2>
      <p>By submitting a booking or question you consent to this processing. You can withdraw consent at any time by contacting us, though this may end our ability to serve you.</p>
      <p class="fine-print">This policy is a plain-language summary and should be reviewed by a qualified Nigerian legal practitioner before launch.</p>
    </div>
  </section>`;
  return layout(ctx, { title: 'Privacy & Confidentiality', description: 'How As the Spirit Leads collects, protects, retains and deletes counselling data.', body });
}

function emergency(ctx) {
  const body = `
  ${pageHero({ eyebrow: 'Safety first', title: 'Emergency guidance & disclaimer', sub: 'Counselling supports wellbeing. It is not emergency care.' })}
  <section class="section">
    <div class="wrap prose narrow">
      <div class="alert alert-red">
        <h2>If someone is in immediate danger</h2>
        <p>Call your local emergency number or go to the nearest hospital emergency department. In Nigeria, the national emergency number is <strong>112</strong>. Do not wait for a website reply.</p>
      </div>
      <h2>What this service is</h2>
      <p>As the Spirit Leads provides counselling and advisory conversations with qualified practitioners. Sessions are confidential, scheduled, and structured around your goals.</p>
      <h2>What this service is not</h2>
      <ul class="ticks">
        <li>${icon('check', 'ico ico-xs')} Not a medical or psychiatric service, and not a substitute for diagnosis or treatment.</li>
        <li>${icon('check', 'ico ico-xs')} Not an emergency or crisis response service, and not monitored 24 hours a day.</li>
        <li>${icon('check', 'ico ico-xs')} Not legal, financial or investment advice.</li>
      </ul>
      <h2>When we may involve others</h2>
      <p>Confidentiality has legal limits. If there is a credible risk of serious harm to you or another person, or where disclosure is required by law or a court order, we will act to protect safety and tell you what we are doing wherever possible.</p>
      <h2>Support lines</h2>
      <p>Nigeria: emergency <strong>112</strong>. For mental-health support, ask your hospital or primary care provider for a referral. Outside Nigeria, use your national emergency number.</p>
      <p><a href="/book" class="btn btn-primary">Book a session</a> <a href="/ask" class="btn btn-outline">Ask a question</a></p>
    </div>
  </section>`;
  return layout(ctx, { title: 'Emergency & Disclaimer', description: 'Emergency guidance and the limits of counselling services at As the Spirit Leads.', body });
}

function notFound(ctx) {
  const body = `
  <section class="section">
    <div class="wrap narrow center-block">
      <p class="eyebrow eyebrow-red">404</p>
      <h1>We could not find that page</h1>
      <p class="lede">The link may be old. Try one of these instead.</p>
      <p><a class="btn btn-primary" href="/">Home</a> <a class="btn btn-outline" href="/services">Services</a> <a class="btn btn-outline" href="/counselors">Counsellors</a></p>
    </div>
  </section>`;
  return layout(ctx, { title: 'Page not found', description: 'Page not found.', body });
}

module.exports = { contact, privacy, emergency, notFound };
