'use strict';
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const csrf = ($('meta[name="csrf-token"]') || {}).content || '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function api(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      credentials: 'same-origin',
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { data, status: res.status });
    return data;
  }

  function setState(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = `save-state small ${kind === 'error' ? 'is-error' : 'is-saved'}`;
    if (kind !== 'error') setTimeout(() => { el.textContent = ''; }, 4000);
  }

  // ---------- login ----------
  const loginForm = $('form[data-form="login"]');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = $('[data-form-error]', loginForm);
      const btn = loginForm.querySelector('button[type="submit"]');
      if (errorBox) errorBox.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      try {
        const data = await api('/api/admin/login', {
          email: loginForm.elements.email.value,
          password: loginForm.elements.password.value,
        });
        window.location.assign(data.redirect || '/admin');
      } catch (err) {
        if (errorBox) { errorBox.hidden = false; errorBox.textContent = err.message; }
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    });
  }

  // ---------- logout ----------
  $$('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await api('/api/admin/logout'); } catch { /* ignore */ }
      window.location.assign('/admin');
    });
  });

  // ---------- request updates ----------
  $$('[data-request-update]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const record = form.closest('[data-request-id]');
      const id = record.dataset.requestId;
      const state = $('[data-save-state]', form);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await api(`/api/admin/requests/${id}`, {
          status: form.elements.status.value,
          assigned_to: form.elements.assigned_to.value,
          admin_note: form.elements.admin_note.value,
          reply_text: form.elements.reply_text.value,
        });
        setState(state, 'Saved');
      } catch (err) {
        setState(state, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });

  // ---------- booking updates ----------
  $$('[data-booking-update]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const record = form.closest('[data-booking-id]');
      const id = record.dataset.bookingId;
      const state = $('[data-save-state]', form);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      const original = btn.textContent;
      try {
        await api(`/api/admin/bookings/${id}`, {
          status: form.elements.status.value,
          admin_note: form.elements.admin_note.value,
        });
        setState(state, 'Updated');
        if (form.elements.status.value !== original) window.location.reload();
      } catch (err) {
        setState(state, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });

  // ---------- counsellor create ----------
  const createForm = $('[data-counselor-create]');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = $('[data-form-error]', createForm);
      if (errorBox) errorBox.hidden = true;
      try {
        await api('/api/admin/counselors', {
          name: createForm.elements.name.value,
          title: createForm.elements.title.value,
          qualifications: createForm.elements.qualifications.value,
          whatsapp: createForm.elements.whatsapp.value,
          bio: createForm.elements.bio.value,
          specialties: createForm.elements.specialties.value,
        });
        window.location.reload();
      } catch (err) {
        if (errorBox) { errorBox.hidden = false; errorBox.textContent = err.message; }
      }
    });
  }

  // ---------- counsellor update ----------
  $$('[data-counselor-update]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const record = form.closest('[data-counselor-id]');
      const id = Number(record.dataset.counselorId);
      const state = $('[data-save-state]', form);
      const btn = form.querySelector('button[type="submit"]');
      const val = (name) => (form.elements[name] ? form.elements[name].value : '');
      const checked = (name) => $$(`input[name="${name}"]:checked`, form).map((i) => i.value).join(',');
      btn.disabled = true;
      try {
        await api('/api/admin/counselors', {
          id,
          name: val('name'),
          title: val('title'),
          role_label: val('role_label'),
          photo: val('photo'),
          qualifications: val('qualifications'),
          bio: val('bio'),
          approach: val('approach'),
          languages: val('languages'),
          whatsapp: val('whatsapp'),
          specialties: checked('specialties'),
          formats: checked('formats'),
          work_days: checked('work_days'),
        });
        setState(state, 'Saved');
      } catch (err) {
        setState(state, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });

  $$('[data-counselor-toggle]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.counselorToggle;
      const active = btn.dataset.active === '1';
      btn.disabled = true;
      try {
        await api(`/api/admin/counselors/${id}/${active ? 'activate' : 'deactivate'}`);
        window.location.reload();
      } catch (err) {
        btn.disabled = false;
        alert(err.message);
      }
    });
  });

  $$('[data-counselor-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.counselorDelete;
      if (!window.confirm('Delete this counsellor? Profiles with bookings are hidden instead of deleted.')) return;
      btn.disabled = true;
      try {
        const data = await api(`/api/admin/counselors/${id}/delete`);
        if (data.note) alert(data.note);
        window.location.reload();
      } catch (err) {
        btn.disabled = false;
        alert(err.message);
      }
    });
  });

  // ---------- settings ----------
  const settingsForm = $('[data-settings-form]');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const state = $('[data-save-state]', settingsForm);
      const btn = settingsForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      const payload = {};
      ['site_name', 'email', 'phone', 'whatsapp', 'address', 'hours'].forEach((k) => { payload[k] = settingsForm.elements[k].value; });
      try {
        await api('/api/admin/settings', payload);
        setState(state, 'Settings saved');
      } catch (err) {
        setState(state, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  const passwordForm = $('[data-password-form]');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = $('[data-form-error]', passwordForm);
      if (errorBox) errorBox.hidden = true;
      if (passwordForm.elements.new_password.value !== passwordForm.elements.confirm.value) {
        if (errorBox) { errorBox.hidden = false; errorBox.textContent = 'The two passwords do not match.'; }
        return;
      }
      try {
        await api('/api/admin/settings', { new_password: passwordForm.elements.new_password.value });
        passwordForm.reset();
        const state = $('[data-save-state]', passwordForm);
        setState(state, 'Password updated');
      } catch (err) {
        if (errorBox) { errorBox.hidden = false; errorBox.textContent = err.message; }
      }
    });
  }

  // ---------- outbox ----------
  $$('[data-outbox-retry]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Retrying…';
      try {
        const data = await api(`/api/admin/outbox/${btn.dataset.outboxRetry}/retry`);
        btn.textContent = data.ok ? 'Sent' : (data.status || 'Failed');
        if (!data.ok && data.error) btn.title = data.error;
      } catch (err) {
        btn.textContent = 'Failed';
        btn.title = err.message;
      }
    });
  });

  const retryAll = $('[data-outbox-retry-all]');
  if (retryAll) {
    retryAll.addEventListener('click', async () => {
      retryAll.disabled = true;
      retryAll.textContent = 'Retrying…';
      try {
        await api('/api/admin/outbox/retry-all');
      } catch (err) {
        alert(err.message);
      }
      window.location.reload();
    });
  }
})();
