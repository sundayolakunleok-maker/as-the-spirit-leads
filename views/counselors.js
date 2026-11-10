'use strict';
const { layout, esc, icon } = require('./layout');
const { pageHero } = require('./about');

function formatChips(formats) {
  return String(formats || '').split(',').filter(Boolean)
    .map((f) => `<span class="chip">${esc(f === 'in-person' ? 'In person' : f.charAt(0).toUpperCase() + f.slice(1))}</span>`).join('');
}

function counselorCard(c, cats) {
  const names = String(c.specialties || '').split(',').filter(Boolean)
    .map((s) => (cats.find((x) => x.slug === s) || {}).name).filter(Boolean).slice(0, 2);
  return `<article class="counselor-card" data-specialties="${esc(c.specialties)}">
    <img src="${esc(c.photo || '/assets/emblem.png')}" alt="${esc(c.name)}" loading="lazy">
    <div class="counselor-body">
      <p class="role">${esc(c.role_label || 'Counsellor')}</p>
      <h3><a href="/counselors/${esc(c.slug)}">${esc(c.name)}</a></h3>
      <p class="spec">${esc(c.title)}</p>
      <p class="tags">${names.map((n) => `<span class="tag">${esc(n)}</span>`).join('')}</p>
      <p class="muted">${esc(c.languages)} &middot; ${formatChips(c.formats)}</p>
      <div class="card-actions">
        <a href="/counselors/${esc(c.slug)}" class="btn btn-outline btn-sm">View profile</a>
        <a href="/book?counselor=${esc(c.slug)}" class="btn btn-primary btn-sm">Book</a>
      </div>
    </div>
  </article>`;
}

function directory(ctx, { counselors, selectedCategory, q }) {
  const { categories } = ctx;
  const body = `
  ${pageHero({
    eyebrow: 'Counsellor directory',
    title: 'Qualified counsellors, real specialisms',
    sub: 'Filter by specialty, read each profile, then book directly or start with a question.',
  })}
  <section class="section">
    <div class="wrap">
      <form class="filters" data-filters aria-label="Filter counsellors">
        <div class="field">
          <label for="filter-category">Specialty</label>
          <select id="filter-category" name="category">
            <option value="">All specialties</option>
            ${categories.map((c) => `<option value="${esc(c.slug)}"${selectedCategory === c.slug ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="filter-q">Search by name or language</label>
          <input id="filter-q" name="q" type="search" value="${esc(q || '')}" placeholder="e.g. Yoruba, Eniolaye">
        </div>
        <div class="field field-actions">
          <button class="btn btn-primary" type="submit">Apply filters</button>
          <a class="btn btn-ghost" href="/counselors">Reset</a>
        </div>
      </form>
      <p class="result-count" data-result-count>${counselors.length} counsellor${counselors.length === 1 ? '' : 's'} available</p>
      <div class="counselor-grid" data-counselor-grid>
        ${counselors.map((c) => counselorCard(c, categories)).join('') || '<p class="empty">No counsellors match that filter yet. Try another specialty, or <a href="/ask">send us a question</a>.</p>'}
      </div>
      <div class="notice-panel">
        ${icon('users', 'ico')}
        <div>
          <h3>Are you a counsellor?</h3>
          <p>We welcome qualified, affiliated counsellors who share our standards on confidentiality and competence. Write to <a href="mailto:asthespiritleads@gmail.com">asthespiritleads@gmail.com</a> with your credentials.</p>
        </div>
      </div>
    </div>
  </section>`;
  return layout(ctx, { title: 'Our Counsellors', description: 'Browse qualified counsellors at As the Spirit Leads, filter by specialty and book a session.', body });
}

function profile(ctx, { counselor: c, categoryNames, whatsapp }) {
  const body = `
  <section class="profile-hero">
    <div class="wrap profile-grid">
      <img class="profile-photo" src="${esc(c.photo || '/assets/emblem.png')}" alt="${esc(c.name)}">
      <div>
        <p class="crumb"><a href="/counselors">Counsellors</a> ${icon('arrow', 'ico ico-xs')} ${esc(c.name)}</p>
        <p class="eyebrow eyebrow-red">${esc(c.role_label || 'Counsellor')}</p>
        <h1>${esc(c.name)}</h1>
        <p class="profile-title">${esc(c.title)}</p>
        <p class="tags">${categoryNames.map((n) => `<span class="tag">${esc(n)}</span>`).join('')}</p>
        <div class="profile-facts">
          <div>${icon('users', 'ico ico-sm')}<span><strong>Languages</strong>${esc(c.languages)}</span></div>
          <div>${icon('clock', 'ico ico-sm')}<span><strong>Formats</strong>${esc(String(c.formats).split(',').join(', '))}</span></div>
          <div>${icon('calendar', 'ico ico-sm')}<span><strong>Availability</strong>${esc(workDaysLabel(c.work_days))}, WAT</span></div>
        </div>
        <div class="hero-actions">
          <a href="/book?counselor=${esc(c.slug)}" class="btn btn-primary btn-lg">Book with ${esc(c.name.split(' ')[0])}</a>
          ${whatsapp ? `<a href="${esc(whatsapp)}" class="btn btn-outline btn-lg" target="_blank" rel="noopener">${icon('chat', 'ico ico-sm')} WhatsApp</a>` : ''}
        </div>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap detail-grid">
      <article class="prose">
        <h2>About</h2>
        <p>${esc(c.bio)}</p>
        <h2>Counselling approach</h2>
        <p>${esc(c.approach)}</p>
        <h2>Qualifications</h2>
        <p>${esc(c.qualifications)}</p>
        <h2>Areas of specialisation</h2>
        <ul class="ticks">${categoryNames.map((n) => `<li>${icon('check', 'ico ico-xs')} ${esc(n)}</li>`).join('')}</ul>
      </article>
      <aside class="aside-card">
        <h3>Book a session</h3>
        <p class="muted">50-minute confidential session, online, by telephone or in person. All times West Africa Time.</p>
        <a href="/book?counselor=${esc(c.slug)}" class="btn btn-primary btn-block">Choose a time</a>
        ${whatsapp ? `<a href="${esc(whatsapp)}" class="btn btn-outline btn-block" target="_blank" rel="noopener">Message on WhatsApp</a>` : ''}
        <a href="/ask" class="btn btn-ghost btn-block">Ask a question instead</a>
        <p class="aside-note">${icon('shield', 'ico ico-xs')} Your contact details are only shared with this counsellor and authorised staff.</p>
      </aside>
    </div>
  </section>`;
  return layout(ctx, { title: c.name, description: `${c.name}, ${c.title} at As the Spirit Leads. ${c.qualifications}`, body });
}

function workDaysLabel(value) {
  const names = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
  return String(value || '1,2,3,4,5').split(',').map((d) => names[d.trim()] || '').filter(Boolean).join(', ');
}

module.exports = { directory, profile, counselorCard, workDaysLabel };
