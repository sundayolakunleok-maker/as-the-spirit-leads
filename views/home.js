'use strict';
const { layout, esc, icon } = require('./layout');

function catCard(c) {
  return `<a class="cat-card" href="/services/${esc(c.slug)}">
    <span class="cat-ico">${icon(c.icon)}</span>
    <h3>${esc(c.name)}</h3>
    <p>${esc(c.short_desc)}</p>
    <span class="cat-more">Explore ${icon('arrow', 'ico ico-xs')}</span>
  </a>`;
}

function home(ctx) {
  const { categories, counselors, settings } = ctx;
  const founder = counselors.find((c) => c.role_label === 'Founder') || counselors[0];
  const cards = categories.map(catCard).join('');
  const body = `
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">${icon('shield', 'ico ico-sm')} Confidential &middot; Professional &middot; Faith-respecting</p>
        <h1>You do not have to carry it alone.</h1>
        <p class="lede">As the Spirit Leads offers calm, confidential counselling for individuals, couples and families. Ask a question anonymously, or book a session with a counsellor who understands your season.</p>
        <div class="hero-actions">
          <a href="/book" class="btn btn-primary btn-lg">Book a session</a>
          <a href="/ask" class="btn btn-outline btn-lg">Ask anonymously</a>
        </div>
        <ul class="hero-points">
          <li>${icon('lock', 'ico ico-sm')} Nothing shared without your consent</li>
          <li>${icon('clock', 'ico ico-sm')} Online, telephone or in person</li>
          <li>${icon('check', 'ico ico-sm')} West Africa Time scheduling</li>
        </ul>
      </div>
      <div class="hero-media">
        <div class="hero-frame">
          <img src="/assets/founder.jpg" alt="${esc(founder ? founder.name : 'Lead counsellor')}, founder of As the Spirit Leads" width="560" height="640" loading="eager">
          <div class="hero-badge">
            <strong>${esc(founder ? founder.name : 'Okegbemi Eniolaye Aishat')}</strong>
            <span>${esc(founder ? founder.title : 'Founder &amp; Lead Counsellor')}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="hero-rule"></div>
  </section>

  <section class="trust-strip">
    <div class="wrap trust-grid">
      <div class="trust-item">${icon('shield', 'ico')}<div><strong>Confidential by design</strong><span>Encrypted in transit, minimum data collected, clear retention rules.</span></div></div>
      <div class="trust-item">${icon('users', 'ico')}<div><strong>Qualified counsellors</strong><span>Specialised support across marriage, family, academics, career and wellbeing.</span></div></div>
      <div class="trust-item">${icon('chat', 'ico')}<div><strong>Ask without your name</strong><span>Truly anonymous questions, answered privately where you choose.</span></div></div>
      <div class="trust-item">${icon('clock', 'ico')}<div><strong>Flexible sessions</strong><span>Weekday slots in West Africa Time, online or in person.</span></div></div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow eyebrow-red">Where we help</p>
        <h2>Counselling for the season you are in</h2>
        <p class="section-sub">Eight focused areas of practice, each with its own counsellor team and booking path.</p>
      </div>
      <div class="cat-grid">${cards}</div>
      <div class="center"><a href="/services" class="btn btn-outline">See all services ${icon('arrow', 'ico ico-xs')}</a></div>
    </div>
  </section>

  <section class="section section-tint">
    <div class="wrap split">
      <div>
        <p class="eyebrow eyebrow-red">How it works</p>
        <h2>Simple, private, and paced for you</h2>
        <ol class="steps">
          <li><span class="step-n">1</span><div><h3>Reach out your way</h3><p>Send an anonymous question, or book a session directly. No account needed for either.</p></div></li>
          <li><span class="step-n">2</span><div><h3>We match you with a counsellor</h3><p>Choose a counsellor yourself, or let us assign the next available one for your category.</p></div></li>
          <li><span class="step-n">3</span><div><h3>Meet online, by phone, or in person</h3><p>Sessions run 50 minutes. You receive a reference number and confirmation immediately.</p></div></li>
          <li><span class="step-n">4</span><div><h3>Keep what is useful</h3><p>Agree one or two next steps, with a follow-up session if you want one.</p></div></li>
        </ol>
      </div>
      <aside class="promise-card">
        <h3>${icon('lock', 'ico')} Our confidentiality promise</h3>
        <p>What you share stays with your counsellor and the clinical team. We do not sell, publish, or share your details. Anonymous questions carry no name, email or phone number unless you choose to add one.</p>
        <p>We ask only for what we need to serve you, keep it on secured storage, and delete dormant records on a published schedule.</p>
        <a href="/privacy" class="link-arrow">Read the privacy policy ${icon('arrow', 'ico ico-xs')}</a>
        <p class="promise-note">If you are in immediate danger, please contact emergency services first. Counselling is not a substitute for medical care.</p>
      </aside>
    </div>
  </section>

  <section class="section">
    <div class="wrap split split-reverse">
      <div class="about-media">
        <img src="/assets/cofounder.jpg" alt="${esc((counselors.find((c) => c.role_label === 'Co-Founder') || {}).name || 'Co-founder')}, co-founder" width="520" height="600" loading="lazy">
      </div>
      <div>
        <p class="eyebrow eyebrow-red">Who we are</p>
        <h2>Founded on listening, built on trust</h2>
        <p>As the Spirit Leads was founded by <strong>Okegbemi Eniolaye Aishat</strong> and co-founded by <strong>Okegbemi Sunday Olakunle</strong> to make professional, faith-respecting counsel available to people who would otherwise struggle alone.</p>
        <p>We combine careful listening with practical plans: clear next steps, honest feedback, and follow-up. Couples, families, students, professionals and organisations all have a place here.</p>
        <div class="stat-row">
          <div><strong>8</strong><span>counselling areas</span></div>
          <div><strong>50</strong><span>minute sessions</span></div>
          <div><strong>3</strong><span>session formats</span></div>
          <div><strong>100%</strong><span>confidential</span></div>
        </div>
        <a href="/about" class="link-arrow">More about our approach ${icon('arrow', 'ico ico-xs')}</a>
      </div>
    </div>
  </section>

  <section class="section section-blue">
    <div class="wrap cta-band">
      <div>
        <h2>Ready to talk, or not sure yet?</h2>
        <p>Send a question anonymously and a counsellor will respond through the channel you choose. Nothing is shared publicly.</p>
      </div>
      <div class="cta-actions">
        <a href="/ask" class="btn btn-light btn-lg">Ask anonymously</a>
        <a href="/book" class="btn btn-red btn-lg">Book a session</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow eyebrow-red">Our counsellors</p>
        <h2>People who will actually listen</h2>
      </div>
      <div class="counselor-grid home-counselors">
        ${counselors.slice(0, 2).map((c) => `
          <article class="counselor-card">
            <img src="${esc(c.photo || '/assets/emblem.png')}" alt="${esc(c.name)}" loading="lazy">
            <div>
              <p class="role">${esc(c.role_label || 'Counsellor')}</p>
              <h3>${esc(c.name)}</h3>
              <p class="spec">${esc(c.qualifications)}</p>
              <a href="/counselors/${esc(c.slug)}" class="link-arrow">View profile ${icon('arrow', 'ico ico-xs')}</a>
            </div>
          </article>`).join('')}
      </div>
      <div class="center"><a href="/counselors" class="btn btn-outline">Meet the team ${icon('arrow', 'ico ico-xs')}</a></div>
    </div>
  </section>

  <section class="emergency-strip">
    <div class="wrap emergency-inner">
      <p><strong>In crisis right now?</strong> If you or someone else is in immediate danger, contact your local emergency number or the nearest hospital before booking a counselling session.</p>
      <a href="/emergency" class="link-arrow">Emergency guidance ${icon('arrow', 'ico ico-xs')}</a>
    </div>
  </section>`;
  return layout(ctx, {
    title: '',
    description: `Confidential counselling in Nigeria with ${settings.site_name}: marriage, family, academic, career and emotional support. Ask anonymously or book a session.`,
    body,
    bodyClass: 'page-home',
  });
}

module.exports = { home, catCard };
