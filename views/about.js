'use strict';
const { layout, esc, icon } = require('./layout');

function pageHero({ eyebrow, title, sub, kicker }) {
  return `<section class="page-hero">
    <div class="wrap">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h1>${esc(title)}</h1>
      ${sub ? `<p class="lede">${esc(sub)}</p>` : ''}
      ${kicker || ''}
    </div>
  </section>`;
}

function about(ctx) {
  const { counselors } = ctx;
  const founder = counselors.find((c) => c.role_label === 'Founder') || counselors[0] || {};
  const cofounder = counselors.find((c) => c.role_label === 'Co-Founder') || counselors[1] || {};
  const body = `
  ${pageHero({
    eyebrow: 'About us',
    title: 'Compassionate counsel, held in confidence',
    sub: 'As the Spirit Leads exists so that no one has to sort through marriage, family, study, career or emotional strain without a trained, trustworthy companion.',
  })}
  <section class="section">
    <div class="wrap split">
      <div>
        <h2>Our mission</h2>
        <p>To provide confidential, professional and faith-respecting counselling that helps individuals, couples, families, students and organisations move from confusion to clarity, and from strain to steady progress.</p>
        <h2>Our vision</h2>
        <p>A Nigeria where asking for counsel is ordinary, respected and free of stigma, and where every person can reach a qualified counsellor without fear of exposure.</p>
        <h2>Our approach</h2>
        <p>Every session is structured: we listen fully, name the real issue, agree one or two practical steps, and follow up. We respect your faith, culture and pace, and we never lecture.</p>
      </div>
      <img class="about-photo" src="/assets/founder.jpg" alt="${esc(founder.name || 'Founder')}" loading="lazy">
    </div>
  </section>

  <section class="section section-tint">
    <div class="wrap">
      <div class="section-head"><p class="eyebrow eyebrow-red">Leadership</p><h2>Meet the founders</h2></div>
      <div class="founder-grid">
        <article class="founder-card">
          <img src="/assets/founder.jpg" alt="${esc(founder.name || '')}" loading="lazy">
          <div>
            <p class="role">${esc(founder.role_label || 'Founder')}</p>
            <h3>${esc(founder.name || 'Okegbemi Eniolaye Aishat')}</h3>
            <p>${esc(founder.bio || '')}</p>
            <p class="muted">${esc(founder.qualifications || '')}</p>
          </div>
        </article>
        <article class="founder-card">
          <img src="/assets/cofounder.jpg" alt="${esc(cofounder.name || '')}" loading="lazy">
          <div>
            <p class="role">${esc(cofounder.role_label || 'Co-Founder')}</p>
            <h3>${esc(cofounder.name || 'Okegbemi Sunday Olakunle')}</h3>
            <p>${esc(cofounder.bio || '')}</p>
            <p class="muted">${esc(cofounder.qualifications || '')}</p>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head"><p class="eyebrow eyebrow-red">What guides us</p><h2>Our values</h2></div>
      <div class="value-grid">
        <div class="value">${icon('lock', 'ico')}<h3>Confidentiality</h3><p>Your story is yours. We collect the minimum, store it securely, and never publish it.</p></div>
        <div class="value">${icon('heart', 'ico')}<h3>Compassion</h3><p>No judgement, no rushed sessions. We meet people where they are.</p></div>
        <div class="value">${icon('shield', 'ico')}<h3>Integrity</h3><p>Honest counsel, clear boundaries, and referral when specialist care is needed.</p></div>
        <div class="value">${icon('check', 'ico')}<h3>Competence</h3><p>Qualified counsellors working within their stated areas of specialisation.</p></div>
        <div class="value">${icon('spark', 'ico')}<h3>Faith-respect</h3><p>Clients who want faith integrated receive counsel that takes scripture seriously.</p></div>
        <div class="value">${icon('users', 'ico')}<h3>Accessibility</h3><p>Online, phone and in-person options, with plain language and fair fees.</p></div>
      </div>
    </div>
  </section>

  <section class="section section-blue">
    <div class="wrap cta-band">
      <div><h2>Talk to a counsellor this week</h2><p>Choose a category and a time that works. It takes about two minutes.</p></div>
      <div class="cta-actions"><a href="/book" class="btn btn-light btn-lg">Book a session</a><a href="/ask" class="btn btn-red btn-lg">Ask anonymously</a></div>
    </div>
  </section>`;
  return layout(ctx, {
    title: 'About Us',
    description: 'The mission, vision, values and founders of As the Spirit Leads: confidential counselling for individuals, couples and families in Nigeria.',
    body,
  });
}

module.exports = { about, pageHero };
