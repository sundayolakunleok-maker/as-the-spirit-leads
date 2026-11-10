'use strict';

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const NAV = [
  ['/', 'Home'],
  ['/about', 'About Us'],
  ['/services', 'Counselling Services'],
  ['/counselors', 'Counsellors'],
  ['/contact', 'Contact'],
];

function icon(name, cls = 'ico') {
  const paths = {
    rings: '<circle cx="9" cy="15" r="5"/><circle cx="15" cy="15" r="5"/><path d="M11 5l4-1-1 4"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2z"/><path d="M8 7h7M8 11h7"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    heart: '<path d="M12 20s-7-4.5-7-9a4 4 0 017-2 4 4 0 017 2c0 4.5-7 9-7 9z"/>',
    spark: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0"/><path d="M16 5a3 3 0 010 6"/><path d="M18 20a6 6 0 00-3-5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    arrow: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    phone: '<path d="M6 3h3l2 5-2 2a12 12 0 005 5l2-2 5 2v3a2 2 0 01-2 2A17 17 0 014 5a2 2 0 012-2z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
    chat: '<path d="M21 12a8 8 0 01-11.4 7.2L4 21l1.8-5.6A8 8 0 1121 12z"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  };
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}

function header(ctx) {
  const { session, settings } = ctx;
  const path = ctx.path;
  const links = NAV.map(([href, label]) => {
    const active = href === '/' ? path === '/' : path.startsWith(href);
    return `<a href="${href}" class="nav-link${active ? ' is-active' : ''}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  const wa = settings.whatsapp ? `<a class="top-link" href="https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}" target="_blank" rel="noopener">${icon('chat', 'ico ico-sm')} WhatsApp</a>` : '';
  const phone = settings.phone ? `<a class="top-link" href="tel:${esc(String(settings.phone).replace(/\s/g, ''))}">${icon('phone', 'ico ico-sm')} ${esc(settings.phone)}</a>` : '';
  return `
  <a href="#main" class="skip-link">Skip to content</a>
  <div class="topbar">
    <div class="wrap topbar-inner">
      <span class="topbar-note">${icon('lock', 'ico ico-sm')} Confidential counselling &middot; ${esc(settings.hours)}</span>
      <span class="topbar-links">${phone}${wa}<a class="top-link" href="mailto:${esc(settings.email)}">${icon('mail', 'ico ico-sm')} ${esc(settings.email)}</a></span>
    </div>
  </div>
  <header class="site-header">
    <div class="wrap header-inner">
      <a href="/" class="brand" aria-label="${esc(settings.site_name)} home">
        <img src="/assets/emblem.png" alt="" width="46" height="46" class="brand-mark">
        <span class="brand-text"><strong>As the Spirit Leads</strong><small>Counselling &amp; Advisory</small></span>
      </a>
      <nav class="nav" aria-label="Main navigation">${links}</nav>
      <div class="header-actions">
        <a href="/ask" class="btn btn-ghost">Ask anonymously</a>
        <a href="/book" class="btn btn-primary">Book a session</a>
      </div>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" data-nav-toggle>
        <span class="sr-only">Menu</span><span></span><span></span><span></span>
      </button>
    </div>
    <div class="mobile-nav" id="mobile-nav" hidden>
      ${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
      <a href="/ask">Ask anonymously</a>
      <a href="/book" class="btn btn-primary">Book a session</a>
      <a href="/admin">Staff sign in</a>
    </div>
  </header>`;
}

function footer(ctx) {
  const { settings } = ctx;
  const cats = (ctx.categories || []).slice(0, 5)
    .map((c) => `<a href="/services/${esc(c.slug)}">${esc(c.name)}</a>`).join('');
  return `
  <footer class="site-footer">
    <div class="wrap footer-grid">
      <div class="footer-brand">
        <img src="/assets/emblem.png" alt="" width="40" height="40">
        <p class="footer-name">As the Spirit Leads</p>
        <p class="footer-blurb">Confidential, professional counselling for individuals, couples, families and organisations across Nigeria.</p>
        <p class="footer-verse">&ldquo;For as many as are led by the Spirit of God, they are the sons of God.&rdquo; &mdash; Romans 8:14</p>
      </div>
      <div>
        <h2 class="footer-h">Explore</h2>
        ${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
      </div>
      <div>
        <h2 class="footer-h">Services</h2>
        ${cats}
      </div>
      <div class="footer-contact">
        <h2 class="footer-h">Talk to us</h2>
        <a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a>
        ${settings.phone ? `<a href="tel:${esc(String(settings.phone).replace(/\s/g, ''))}">${esc(settings.phone)}</a>` : ''}
        ${settings.whatsapp ? `<a href="https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        <span>${esc(settings.address)}</span>
        <span>${esc(settings.hours)}</span>
        <div class="footer-cta"><a class="btn btn-light" href="/book">Book a session</a></div>
      </div>
    </div>
    <div class="wrap footer-bottom">
      <p>&copy; ${new Date().getFullYear()} As the Spirit Leads. All rights reserved.</p>
      <nav aria-label="Legal">
        <a href="/privacy">Privacy &amp; confidentiality</a>
        <a href="/emergency">Emergency &amp; disclaimer</a>
        <a href="/admin">Staff sign in</a>
      </nav>
    </div>
  </footer>`;
}

function layout(ctx, { title, description, body, bodyClass = '', csrf = '' }) {
  const fullTitle = title ? `${title} | As the Spirit Leads` : 'As the Spirit Leads | Confidential Counselling & Advisory';
  const desc = description || 'Confidential Christian counselling for individuals, couples and families: marriage, parenting, career, academic and emotional support, online and in person in Nigeria.';
  const canonical = `${ctx.origin}${ctx.path}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ctx.origin)}/assets/emblem.png">
<meta name="theme-color" content="#0B1F4B">
<link rel="icon" href="/assets/emblem.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css?v=5">
<meta name="csrf-token" content="${esc(csrf)}">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'As the Spirit Leads',
    description: desc,
    url: ctx.origin,
    email: ctx.settings.email,
    areaServed: 'Nigeria',
    address: { '@type': 'PostalAddress', addressLocality: ctx.settings.address },
    serviceType: 'Counselling and advisory services',
  })}</script>
</head>
<body class="${esc(bodyClass)}">
${header(ctx)}
<main id="main">
${body}
</main>
${footer(ctx)}
<script src="/js/site.js?v=5" defer></script>
</body>
</html>`;
}

module.exports = { layout, esc, icon };
