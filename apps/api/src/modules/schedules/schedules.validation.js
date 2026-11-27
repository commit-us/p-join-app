import { ScheduleError } from './schedules.errors.js';

export const PLATFORMS = Object.freeze(['ZOOM', 'GOOGLE_MEET', 'DISCORD', 'SLACK', 'ZEP', 'OFFLINE', 'ETC']);

const DEFAULT_TIMEZONE = 'Asia/Seoul';
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;
const URL_MAX = 500;
const DAY_MS = 86_400_000;
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;

const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(?:Z|[+-](\d{2}):(\d{2}))$/;
const HAS_MILLISECONDS = /T\d{2}:\d{2}:\d{2}\.\d{3}(?:Z|[+-])/;

export function parseTimestamp(value) {
  if (typeof value !== 'string') return null;
  const match = TIMESTAMP.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute, second, , offsetHour, offsetMinute] = match.slice(1).map((part) => Number(part ?? 0));
  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 14 || offsetMinute > 59) return null;
  // Date silently rolls 02-30 over to March, so the calendar date is read back.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return new Date(value);
}

// Each field parser returns { value } or { reason }.
const ok = (value) => ({ value });
const fail = (reason) => ({ reason });

const isBlank = (value) => value === null || (typeof value === 'string' && value.trim() === '');

function optionalText(max, { trim }) {
  return (input) => {
    if (isBlank(input)) return ok(null);
    if (typeof input !== 'string') return fail('not_a_string');
    // PostgreSQL text cannot store NUL.
    if (input.includes('\u0000')) return fail('invalid_character');
    const value = trim ? input.trim() : input;
    return value.length > max ? fail('too_long') : ok(value);
  };
}

function minuteTimestamp(input) {
  const date = parseTimestamp(input);
  if (!date) return fail('invalid_timestamp');
  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) return fail('seconds_not_allowed');
  return ok(date);
}

function timezone(input) {
  if (typeof input !== 'string' || /^[+-]/.test(input)) return fail('invalid_timezone');
  try {
    return ok(new Intl.DateTimeFormat('en-US', { timeZone: input }).resolvedOptions().timeZone);
  } catch {
    return fail('invalid_timezone');
  }
}

function platform(input) {
  if (isBlank(input)) return ok(null);
  return PLATFORMS.includes(input) ? ok(input) : fail('invalid_platform');
}

function meetingUrl(input) {
  if (isBlank(input)) return ok(null);
  if (typeof input !== 'string') return fail('not_a_string');
  const value = input.trim();
  if (value.length > URL_MAX) return fail('too_long');
  // new URL() accepts "https:/x" and drops newlines, so the raw text is checked too.
  // eslint-disable-next-line no-control-regex
  if (!/^https:\/\//i.test(value) || /[\s\u0000-\u001f\u007f]/.test(value)) return fail('invalid_url');
  let url;
  try {
    url = new URL(value);
  } catch {
    return fail('invalid_url');
  }
  return url.username || url.password ? fail('invalid_url') : ok(value);
}

const FIELDS = {
  title: optionalText(TITLE_MAX, { trim: true }),
  description: optionalText(DESCRIPTION_MAX, { trim: false }),
  startsAt: minuteTimestamp,
  endsAt: (input) => (isBlank(input) ? ok(null) : minuteTimestamp(input)),
  timezone,
  platform,
  meetingUrl,
};

function invalid(fields) {
  return new ScheduleError('VALIDATION_FAILED', 400, { fields });
}

function assertObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid([{ field: 'body', reason: 'not_an_object' }]);
  }
}

function readFields(body, errors, extraAllowed = []) {
  const values = {};
  for (const [name, input] of Object.entries(body)) {
    if (extraAllowed.includes(name)) continue;
    if (!Object.hasOwn(FIELDS, name)) {
      errors.push({ field: name, reason: 'unknown_field' });
      continue;
    }
    const result = FIELDS[name](input);
    if (result.reason) errors.push({ field: name, reason: result.reason });
    else values[name] = result.value;
  }
  return values;
}

export function parseCreate(body) {
  assertObject(body);
  const errors = [];
  const values = readFields(body, errors);
  if (!Object.hasOwn(body, 'startsAt')) errors.push({ field: 'startsAt', reason: 'required' });
  if (values.startsAt && values.endsAt && values.endsAt <= values.startsAt) {
    errors.push({ field: 'endsAt', reason: 'not_after_start' });
  }
  if (errors.length > 0) throw invalid(errors);
  return {
    title: null,
    description: null,
    endsAt: null,
    timezone: DEFAULT_TIMEZONE,
    platform: null,
    meetingUrl: null,
    ...values,
  };
}

// updatedAt is compared for equality, so a value that lost its milliseconds is rejected.
function parsePreciseTimestamp(value) {
  return typeof value === 'string' && HAS_MILLISECONDS.test(value) ? parseTimestamp(value) : null;
}

export function parseBaseUpdatedAt(value) {
  const date = parsePreciseTimestamp(value);
  if (!date) throw invalid([{ field: 'baseUpdatedAt', reason: 'invalid_timestamp' }]);
  return date;
}

export function parseUpdate(body) {
  assertObject(body);
  const errors = [];
  const changes = readFields(body, errors, ['baseUpdatedAt']);
  const baseUpdatedAt = parsePreciseTimestamp(body.baseUpdatedAt);
  if (!baseUpdatedAt) errors.push({ field: 'baseUpdatedAt', reason: 'invalid_timestamp' });
  if (Object.keys(body).every((name) => name === 'baseUpdatedAt')) {
    errors.push({ field: 'body', reason: 'no_changes' });
  }
  if (errors.length > 0) throw invalid(errors);
  return { baseUpdatedAt, changes };
}

export function parseListQuery(query, now) {
  const errors = [];
  const read = (name, fallback) => {
    if (query?.[name] === undefined) return fallback();
    const date = parseTimestamp(query[name]);
    if (!date) errors.push({ field: name, reason: 'invalid_timestamp' });
    return date;
  };
  const from = read('from', () => now);
  const to = read('to', () => from && new Date(from.getTime() + DEFAULT_RANGE_DAYS * DAY_MS));
  if (from && to && (to <= from || to - from > MAX_RANGE_DAYS * DAY_MS)) {
    errors.push({ field: 'to', reason: 'invalid_range' });
  }
  if (errors.length > 0) throw invalid(errors);
  return { from, to };
}
