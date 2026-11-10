'use strict';

class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.status = 422;
    this.errors = errors;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[+()\d\s-]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function str(value, { min = 0, max = 5000, field = 'field', required = false } = {}) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) {
    if (required) throw new ValidationError({ [field]: 'This field is required.' });
    return '';
  }
  if (v.length < min) throw new ValidationError({ [field]: `Please enter at least ${min} characters.` });
  if (v.length > max) throw new ValidationError({ [field]: `Please keep this under ${max} characters.` });
  return v;
}

function email(value, field = 'email') {
  const v = str(value, { max: 200, field });
  if (!v) throw new ValidationError({ [field]: 'Email is required.' });
  if (!EMAIL_RE.test(v)) throw new ValidationError({ [field]: 'Enter a valid email address.' });
  return v.toLowerCase();
}

function optionalEmail(value, field = 'email') {
  const v = str(value, { max: 200, field });
  if (!v) return '';
  if (!EMAIL_RE.test(v)) throw new ValidationError({ [field]: 'Enter a valid email address.' });
  return v.toLowerCase();
}

function optionalPhone(value, field = 'phone') {
  const v = str(value, { max: 30, field });
  if (!v) return '';
  if (!PHONE_RE.test(v)) throw new ValidationError({ [field]: 'Enter a valid phone number.' });
  return v;
}

function dateISO(value, field = 'date') {
  const v = str(value, { field, required: true });
  if (!DATE_RE.test(v) || Number.isNaN(Date.parse(v))) {
    throw new ValidationError({ [field]: 'Choose a valid date.' });
  }
  return v;
}

function timeHHMM(value, field = 'time') {
  const v = str(value, { field, required: true });
  if (!TIME_RE.test(v)) throw new ValidationError({ [field]: 'Choose a valid time.' });
  return v;
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new ValidationError({ [field]: 'Choose one of the available options.' });
  return value;
}

function isPastDate(dateStr) {
  const today = new Date();
  const wat = new Date(today.getTime() + 60 * 60 * 1000); // WAT = UTC+1
  const todayStr = wat.toISOString().slice(0, 10);
  return dateStr < todayStr;
}

function makeRef(prefix) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${s}`;
}

module.exports = {
  ValidationError, str, email, optionalEmail, optionalPhone, dateISO, timeHHMM,
  oneOf, isPastDate, makeRef, DATE_RE, TIME_RE,
};
