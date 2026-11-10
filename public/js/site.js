'use strict';
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const csrf = ($('meta[name="csrf-token"]') || {}).content || '';
  const cookieCsrf = (document.cookie.match(/(?:^|;\s*)asl_csrf=([^;]+)/) || [])[1];

  function token() {
    return csrf || (cookieCsrf ? decodeURIComponent(cookieCsrf) : '');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function api(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token() },
      credentials: 'same-origin',
      body: JSON.stringify(body || {}),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { data, status: res.status });
      return data;
    });
  }

  function showError(container, message, errors) {
    if (!container) return;
    container.hidden = false;
    let html = esc(message);
    if (errors && typeof errors === 'object') {
      const list = Object.entries(errors).map(([k, v]) => `<li><strong>${esc(k.replace(/_/g, ' '))}</strong>: ${esc(v)}</li>`).join('');
      if (list) html += `<ul>${list}</ul>`;
    }
    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError(container) {
    if (container) { container.hidden = true; container.innerHTML = ''; }
    $$('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
  }

  // ---------- navigation ----------
  const toggle = $('[data-nav-toggle]');
  const mobileNav = $('#mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      mobileNav.hidden = open;
    });
  }

  // ---------- booking ----------
  const bookingForm = $('#booking-form');
  if (bookingForm) setupBooking(bookingForm);

  function setupBooking(form) {
    const prefill = JSON.parse(form.dataset.prefill || '{}');
    const catSel = form.elements.category;
    const counselorSel = form.elements.counselor;
    const dateEl = form.elements.date;
    const slotsEl = $('[data-slots]', form);
    const timeInput = form.elements.time;
    const summary = $('[data-summary]');
    const errorBox = $('[data-form-error]', form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const counselorHint = $('[data-counselor-hint]');
    const allCounselors = $$('option', counselorSel).filter((o) => o.value).map((o) => ({ slug: o.value, name: o.textContent }));

    const today = new Date();
    const min = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
    dateEl.min = min;

    function pad(n) { return String(n).padStart(2, '0'); }
    function todayWat() {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }

    function updateSummary() {
      if (!summary) return;
      const cat = catSel.options[catSel.selectedIndex];
      const co = counselorSel.options[counselorSel.selectedIndex];
      $('[data-sum="category"]', summary).textContent = catSel.value ? cat.textContent : '—';
      $('[data-sum="counselor"]', summary).textContent = counselorSel.value ? co.textContent : 'Next available';
      $('[data-sum="format"]', summary).textContent = form.elements.format.options[form.elements.format.selectedIndex].textContent;
      $('[data-sum="when"]', summary).textContent = dateEl.value
        ? `${dateEl.value}${timeInput.value ? ' at ' + timeInput.value : ''}`
        : '—';
    }

    async function loadSlots() {
      timeInput.value = '';
      updateSummary();
      if (!dateEl.value) {
        slotsEl.innerHTML = '<p class="muted">Choose a date to see open times.</p>';
        return;
      }
      if (dateEl.value < todayWat()) {
        dateEl.value = '';
        slotsEl.innerHTML = '<p class="muted">Please choose today or a future date.</p>';
        return;
      }
      slotsEl.innerHTML = '<p class="muted">Checking availability…</p>';
      const counselorId = '';
      const qs = new URLSearchParams({ date: dateEl.value });
      if (counselorSel.value) qs.set('counselor', counselorSel.value);
      try {
        const res = await fetch(`/api/availability?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load times.');
        if (data.closed || !data.slots.length) {
          slotsEl.innerHTML = `<p class="muted">${esc(data.reason || 'No open times on that date. Please try another day.')}</p>`;
          return;
        }
        slotsEl.innerHTML = data.slots.map((t) =>
          `<button type="button" class="slot" data-slot="${esc(t)}" role="radio" aria-checked="false">${esc(t)}</button>`).join('');
      } catch (err) {
        slotsEl.innerHTML = `<p class="muted">${esc(err.message)}</p>`;
      }
    }

    slotsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-slot]');
      if (!btn) return;
      $$('.slot', slotsEl).forEach((b) => { b.classList.remove('is-selected'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('is-selected');
      btn.setAttribute('aria-checked', 'true');
      timeInput.value = btn.dataset.slot;
      updateSummary();
      clearError(errorBox);
    });

    catSel.addEventListener('change', () => {
      if (!catSel.value) { updateSummary(); return; }
      const slug = catSel.options[catSel.selectedIndex].dataset.slug || '';
      fetch(`/api/counselors?category=${encodeURIComponent(slug)}`)
        .then((r) => r.json())
        .then((data) => {
          const keep = counselorSel.value;
          counselorSel.innerHTML = '<option value="">Next available counsellor</option>' +
            data.counselors.map((c) => `<option value="${esc(c.slug)}">${esc(c.name)} — ${esc(c.title)}</option>`).join('');
          if (data.counselors.some((c) => c.slug === keep)) counselorSel.value = keep;
          if (counselorHint) {
            counselorHint.textContent = data.counselors.length
              ? `${data.counselors.length} counsellor${data.counselors.length === 1 ? '' : 's'} serve this category.`
              : 'A counsellor will be matched to you from our team.';
          }
          updateSummary();
          loadSlots();
        })
        .catch(() => {});
    });

    [counselorSel, dateEl, form.elements.format].forEach((el) => {
      el.addEventListener('change', () => {
        if (el === counselorSel || el === dateEl) loadSlots();
        updateSummary();
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError(errorBox);
      const missing = [];
      ['category', 'format', 'date', 'client_name', 'email', 'time'].forEach((name) => {
        const el = form.elements[name];
        if (!el.value) { missing.push(el); el.setAttribute('aria-invalid', 'true'); }
      });
      if (!form.elements.consent.checked) missing.push(form.elements.consent);
      if (missing.length) {
        showError(errorBox, 'Please complete the highlighted fields.');
        missing[0].focus();
        return;
      }
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Booking…';
      try {
        const data = await api('/api/bookings', {
          category: Number(catSel.value),
          counselor: counselorSel.value,
          format: form.elements.format.value,
          date: dateEl.value,
          time: timeInput.value,
          client_name: form.elements.client_name.value,
          email: form.elements.email.value,
          phone: form.elements.phone.value,
          notes: form.elements.notes.value,
          consent: form.elements.consent.checked,
        });
        renderBookingConfirmation(data);
      } catch (err) {
        if (err.status === 409) loadSlots();
        showError(errorBox, err.message, err.data && err.data.errors);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });

    function renderBookingConfirmation(data) {
      const shell = $('[data-booking-result]');
      const b = data.booking;
      shell.hidden = false;
      shell.innerHTML = `<div class="confirmation">
        <p class="eyebrow eyebrow-red">Booking received</p>
        <h2>Thank you — your session is reserved</h2>
        <p class="ref">${esc(b.ref)}</p>
        <p class="muted">Keep this reference. A confirmation email is on its way to ${esc(form.elements.email.value)}.</p>
        <dl class="detail-list">
          <div><dt>Service</dt><dd>${esc(b.category)}</dd></div>
          <div><dt>Counsellor</dt><dd>${esc(b.counselor)}</dd></div>
          <div><dt>Date &amp; time</dt><dd>${esc(b.date)} at ${esc(b.time)} WAT</dd></div>
          <div><dt>Format</dt><dd>${esc(b.format)}</dd></div>
          <div><dt>Duration</dt><dd>${esc(b.duration)} minutes</dd></div>
        </dl>
        <p class="fine-print">We will confirm the appointment shortly. To change or cancel, email asthespiritleads@gmail.com quoting ${esc(b.ref)}.</p>
        <p><a class="btn btn-outline" href="/">Back to home</a></p>
      </div>`;
      shell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.reset();
      timeInput.value = '';
      updateSummary();
    }

    if (prefill.category) {
      catSel.value = prefill.category;
      catSel.dispatchEvent(new Event('change'));
    }
    if (prefill.counselor) {
      counselorSel.value = prefill.counselor;
    }
    updateSummary();
  }

  // ---------- anonymous request ----------
  const askForm = $('#ask-form');
  if (askForm) {
    const method = askForm.elements.response_method;
    const contactFields = $('[data-contact-fields]', askForm);
    const phoneField = $('[data-contact-phone]', askForm);
    const errorBox = $('[data-form-error]', askForm);
    const submitBtn = askForm.querySelector('button[type="submit"]');

    function syncContact() {
      const m = method.value;
      contactFields.hidden = !(m === 'email' || m === 'whatsapp' || m === 'phone');
      phoneField.hidden = !(m === 'whatsapp' || m === 'phone');
      askForm.elements.contact_email.required = m === 'email';
      askForm.elements.contact_phone.required = m === 'whatsapp' || m === 'phone';
    }
    method.addEventListener('change', syncContact);
    syncContact();

    askForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError(errorBox);
      if (!askForm.elements.category.value) return showError(errorBox, 'Please choose a counselling category.');
      if (askForm.elements.question.value.trim().length < 20) {
        askForm.elements.question.setAttribute('aria-invalid', 'true');
        return showError(errorBox, 'Please write at least 20 characters so a counsellor can understand your situation.');
      }
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      try {
        const data = await api('/api/requests', {
          category: Number(askForm.elements.category.value),
          question: askForm.elements.question.value,
          response_method: method.value,
          contact_name: askForm.elements.contact_name.value,
          contact_email: askForm.elements.contact_email.value,
          contact_phone: askForm.elements.contact_phone.value,
          website: askForm.elements.website.value,
        });
        const shell = $('[data-request-result]');
        shell.hidden = false;
        shell.innerHTML = `<div class="confirmation">
          <p class="eyebrow eyebrow-red">Question received</p>
          <h2>Your question is with our team</h2>
          <p class="ref">${esc(data.ref)}</p>
          <p class="muted">${method.value === 'none'
            ? 'Because you chose not to leave a contact method, please keep this reference. Contact us quoting it if you would like a reply.'
            : 'A counsellor will respond through the method you chose, usually within one to two working days.'}</p>
          <p class="fine-print">If you are in immediate danger, contact emergency services. This form is not monitored 24/7.</p>
          <p><a class="btn btn-outline" href="/">Back to home</a></p>
        </div>`;
        shell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        askForm.reset();
        syncContact();
      } catch (err) {
        showError(errorBox, err.message, err.data && err.data.errors);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }
})();
