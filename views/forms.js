'use strict';
const { layout, esc, icon } = require('./layout');
const { pageHero } = require('./about');
const { workDaysLabel } = require('./counselors');

function optionList(items, selected, valueKey = 'slug', labelKey = 'name') {
  return items.map((i) => `<option value="${esc(i[valueKey])}"${i[valueKey] === selected ? ' selected' : ''}>${esc(i[labelKey])}</option>`).join('');
}

// Category options submit the database id, while remembering the slug for filtering.
function catOptions(categories, selectedSlug) {
  return categories.map((c) =>
    `<option value="${c.id}" data-slug="${esc(c.slug)}"${c.slug === selectedSlug ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
}

function book(ctx, { categories, counselors, prefill }) {
  const body = `
  ${pageHero({
    eyebrow: 'Book a session',
    title: 'Book a confidential session',
    sub: 'Choose a service, a counsellor and a time. You will receive a reference number immediately, and a confirmation by email.',
  })}
  <section class="section">
    <div class="wrap booking-grid">
      <form class="card form booking-form" id="booking-form" novalidate data-form="booking" data-prefill='${esc(JSON.stringify(prefill || {}))}'>
        <div class="form-error" data-form-error role="alert" hidden></div>
        <fieldset>
          <legend><span class="step-n">1</span> What do you need help with?</legend>
          <div class="field">
            <label for="category">Counselling category</label>
            <select id="category" name="category" required>
              <option value="">Select a category</option>
              ${catOptions(categories, prefill.category)}
            </select>
          </div>
          <div class="field">
            <label for="counselor">Preferred counsellor</label>
            <select id="counselor" name="counselor">
              <option value="">Next available counsellor</option>
              ${optionList(counselors, prefill.counselor)}
            </select>
            <p class="hint" data-counselor-hint>Counsellors are matched to the category you choose.</p>
          </div>
        </fieldset>

        <fieldset>
          <legend><span class="step-n">2</span> Choose a time</legend>
          <div class="field-row">
            <div class="field">
              <label for="format">Session format</label>
              <select id="format" name="format" required>
                <option value="online">Online (secure video)</option>
                <option value="telephone">Telephone</option>
                <option value="in-person">In person (Lagos)</option>
              </select>
            </div>
            <div class="field">
              <label for="date">Date (WAT)</label>
              <input id="date" name="date" type="date" required data-min="${esc(prefill.tomorrow || '')}">
            </div>
          </div>
          <div class="field">
            <label id="slot-label">Available times (West Africa Time)</label>
            <div class="slots" data-slots role="radiogroup" aria-labelledby="slot-label">
              <p class="muted">Choose a counsellor and date to see open times.</p>
            </div>
            <input type="hidden" name="time" data-time-input required>
          </div>
        </fieldset>

        <fieldset>
          <legend><span class="step-n">3</span> Your details</legend>
          <div class="field-row">
            <div class="field"><label for="client_name">Full name</label><input id="client_name" name="client_name" autocomplete="name" required></div>
            <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
          </div>
          <div class="field"><label for="phone">Phone / WhatsApp <span class="opt">(optional but helps for reminders)</span></label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
          <div class="field"><label for="notes">Briefly, what would you like to talk about? <span class="opt">(optional, kept confidential)</span></label><textarea id="notes" name="notes" rows="4" maxlength="2000"></textarea></div>
          <label class="check"><input type="checkbox" name="consent" required> I understand counselling is not emergency care, and I consent to being contacted about this booking.</label>
        </fieldset>

        <button class="btn btn-primary btn-lg btn-block" type="submit">Confirm booking</button>
        <p class="fine-print">You will get a reference number instantly. We never share your details with third parties.</p>
      </form>

      <aside class="booking-aside">
        <div class="card summary" data-summary>
          <h3>Your booking</h3>
          <dl>
            <div><dt>Category</dt><dd data-sum="category">—</dd></div>
            <div><dt>Counsellor</dt><dd data-sum="counselor">Next available</dd></div>
            <div><dt>Format</dt><dd data-sum="format">Online</dd></div>
            <div><dt>Date &amp; time</dt><dd data-sum="when">—</dd></div>
            <div><dt>Duration</dt><dd>50 minutes</dd></div>
          </dl>
          <p class="summary-note">${icon('clock', 'ico ico-xs')} All times West Africa Time (UTC+1).</p>
        </div>
        <div class="card help-card">
          <h3>${icon('chat', 'ico')} Prefer to ask first?</h3>
          <p>Send your question anonymously and a counsellor will reply through the method you choose.</p>
          <a href="/ask" class="btn btn-outline btn-block">Ask anonymously</a>
        </div>
        <div class="card help-card">
          <h3>${icon('phone', 'ico')} Need help booking?</h3>
          <p>Email <a href="mailto:asthespiritleads@gmail.com">asthespiritleads@gmail.com</a> and our team will schedule you.</p>
        </div>
      </aside>
    </div>
  </section>
  <section class="section section-tint">
    <div class="wrap confirmation-shell" data-booking-result hidden></div>
  </section>`;
  return layout(ctx, {
    title: 'Book a Session',
    description: 'Book a confidential counselling session online, by telephone or in person. Choose your counsellor, date and time in West Africa Time.',
    body,
  });
}

function ask(ctx, { categories, prefill }) {
  const body = `
  ${pageHero({
    eyebrow: 'Anonymous counselling',
    title: 'Ask a question without giving your name',
    sub: 'No account, no name, no email required. Describe what is happening and a counsellor will respond through the method you choose.',
  })}
  <section class="section">
    <div class="wrap booking-grid">
      <form class="card form" id="ask-form" novalidate data-form="request">
        <div class="form-error" data-form-error role="alert" hidden></div>
        <fieldset>
          <legend><span class="step-n">1</span> Your question</legend>
          <div class="field">
            <label for="category">Counselling category</label>
            <select id="category" name="category" required>
              <option value="">Select a category</option>
              ${catOptions(categories, prefill.category)}
            </select>
          </div>
          <div class="field">
            <label for="question">What would you like help with?</label>
            <textarea id="question" name="question" rows="7" minlength="20" maxlength="4000" required placeholder="Write as much or as little as you are comfortable sharing. Please do not include identifying details of other people."></textarea>
            <p class="hint">At least 20 characters. Do not include full names, addresses or other people's private details.</p>
          </div>
          <div class="field field-hp" aria-hidden="true">
            <label for="website">Website</label>
            <input id="website" name="website" tabindex="-1" autocomplete="off">
          </div>
        </fieldset>
        <fieldset>
          <legend><span class="step-n">2</span> How should we respond?</legend>
          <div class="field">
            <label for="response_method">Preferred response method</label>
            <select id="response_method" name="response_method" data-response-method>
              <option value="none">No reply needed — I only want to submit</option>
              <option value="email">Reply to my email</option>
              <option value="whatsapp">Reply on WhatsApp</option>
              <option value="phone">Call me</option>
            </select>
          </div>
          <div class="field-row" data-contact-fields hidden>
            <div class="field"><label for="contact_name">Name <span class="opt">(a first name is fine)</span></label><input id="contact_name" name="contact_name" autocomplete="given-name"></div>
            <div class="field"><label for="contact_email">Email</label><input id="contact_email" name="contact_email" type="email" autocomplete="email"></div>
          </div>
          <div class="field" data-contact-phone hidden>
            <label for="contact_phone">Phone / WhatsApp number</label><input id="contact_phone" name="contact_phone" type="tel" autocomplete="tel">
          </div>
          <p class="fine-print">${icon('lock', 'ico ico-xs')} Anonymous submissions cannot receive a private reply unless you add a contact method. You can also check back with your reference number.</p>
        </fieldset>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Send my question</button>
      </form>
      <aside class="booking-aside">
        <div class="card help-card">
          <h3>${icon('shield', 'ico')} What happens next</h3>
          <ol class="steps steps-sm">
            <li><span class="step-n">1</span><p>You receive a reference number, e.g. <code>ASL-7K2M4Q</code>.</p></li>
            <li><span class="step-n">2</span><p>A counsellor in that specialisation reviews your question.</p></li>
            <li><span class="step-n">3</span><p>If you left a contact method, we reply privately. Otherwise your question stays on file for follow-up.</p></li>
          </ol>
        </div>
        <div class="card help-card">
          <h3>${icon('heart', 'ico')} Immediate danger?</h3>
          <p>Anonymous counselling is not monitored 24/7. If you are at risk right now, contact emergency services or the nearest hospital first.</p>
          <a href="/emergency" class="link-arrow">Emergency guidance ${icon('arrow', 'ico ico-xs')}</a>
        </div>
      </aside>
    </div>
  </section>
  <section class="section section-tint">
    <div class="wrap confirmation-shell" data-request-result hidden></div>
  </section>`;
  return layout(ctx, {
    title: 'Ask Anonymously',
    description: 'Submit a confidential counselling question anonymously. No name or email required.',
    body,
  });
}

module.exports = { book, ask };
