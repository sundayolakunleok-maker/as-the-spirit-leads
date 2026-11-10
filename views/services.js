'use strict';
const { layout, esc, icon } = require('./layout');
const { catCard } = require('./home');
const { pageHero } = require('./about');

function services(ctx) {
  const { categories } = ctx;
  const body = `
  ${pageHero({
    eyebrow: 'Counselling services',
    title: 'Find the right kind of support',
    sub: 'Each area below has its own counsellor team, its own booking path, and a clear way to ask a question first.',
  })}
  <section class="section">
    <div class="wrap">
      <div class="cat-grid">${categories.map(catCard).join('')}</div>
    </div>
  </section>
  <section class="section section-tint">
    <div class="wrap split">
      <div>
        <p class="eyebrow eyebrow-red">Not sure where you fit?</p>
        <h2>Send us the situation, not the label</h2>
        <p>You do not need to know which category you belong to. Describe what is happening and the intake team will route your request to the right counsellor. You can do this anonymously.</p>
        <a href="/ask" class="btn btn-primary">Ask anonymously</a>
      </div>
      <div class="info-card">
        ${icon('clock', 'ico')}
        <h3>Session formats</h3>
        <p><strong>Online</strong> — secure video link sent with your confirmation.<br>
        <strong>Telephone</strong> — we call the number you provide.<br>
        <strong>In person</strong> — by appointment at our Lagos office.</p>
        <p class="muted">All times are West Africa Time (WAT, UTC+1).</p>
      </div>
    </div>
  </section>`;
  return layout(ctx, {
    title: 'Counselling Services',
    description: 'Marriage, family, academic, career, personal development, emotional wellbeing and faith-based counselling with As the Spirit Leads.',
    body,
  });
}

function category(ctx, cat, extras) {
  const { counselors, settings } = ctx;
  const team = (extras.team || []);
  const body = `
  <section class="page-hero page-hero-cat">
    <div class="wrap">
      <p class="crumb"><a href="/services">Services</a> ${icon('arrow', 'ico ico-xs')} ${esc(cat.name)}</p>
      <h1>${esc(cat.name)}</h1>
      <p class="lede">${esc(cat.short_desc)}</p>
      <div class="hero-actions">
        <a href="/book?category=${esc(cat.slug)}" class="btn btn-primary">Book a ${esc(cat.name.toLowerCase())} session</a>
        <a href="/ask?category=${esc(cat.slug)}" class="btn btn-outline">Ask a question first</a>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap detail-grid">
      <article class="prose">
        <h2>What this covers</h2>
        <p>${esc(cat.description)}</p>
        <h3>How a session works</h3>
        <ul class="ticks">
          <li>${icon('check', 'ico ico-xs')} 50 minutes, online, by telephone or in person</li>
          <li>${icon('check', 'ico ico-xs')} A counsellor from this specialisation is assigned to your request</li>
          <li>${icon('check', 'ico ico-xs')} One or two practical next steps agreed before you leave</li>
          <li>${icon('check', 'ico ico-xs')} Follow-up session at your discretion</li>
        </ul>
        <h3>Confidentiality</h3>
        <p>We collect only what is needed to serve you, and your details are visible only to the counsellor handling your case and authorised staff. Read the <a href="/privacy">privacy policy</a>.</p>
      </article>
      <aside class="aside-card">
        <h3>Available counsellors</h3>
        ${team.length ? team.map((c) => `
          <a class="mini-counselor" href="/counselors/${esc(c.slug)}">
            <img src="${esc(c.photo || '/assets/emblem.png')}" alt="">
            <span><strong>${esc(c.name)}</strong><small>${esc(c.title)}</small></span>
          </a>`).join('') : '<p class="muted">A counsellor will be matched to you from our team.</p>'}
        <a href="/book?category=${esc(cat.slug)}" class="btn btn-primary btn-block">Book this service</a>
        ${settings.whatsapp ? `<a class="btn btn-outline btn-block" href="https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent('Hello As the Spirit Leads, I would like to ask about ' + cat.name)}" target="_blank" rel="noopener">Chat on WhatsApp</a>` : ''}
      </aside>
    </div>
  </section>
  <section class="section section-tint">
    <div class="wrap">
      <div class="section-head"><h2>Other areas of support</h2></div>
      <div class="cat-grid">${ctx.categories.filter((c) => c.id !== cat.id).slice(0, 4).map(catCard).join('')}</div>
    </div>
  </section>`;
  return layout(ctx, {
    title: cat.name,
    description: `${cat.name} counselling with As the Spirit Leads. ${cat.short_desc}`,
    body,
  });
}

module.exports = { services, category };
