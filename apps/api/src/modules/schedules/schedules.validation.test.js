import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimestamp, parseCreate, parseUpdate, parseListQuery, parseBaseUpdatedAt } from './schedules.validation.js';

const valid = { startsAt: '2026-12-03T19:00:00+09:00' };
const base = '2026-11-27T00:00:00.000Z';
const bad = (fn, label) => assert.throws(fn, { code: 'VALIDATION_FAILED', status: 400 }, label);

test('잘못된 시각', () => {
  for (const v of ['2026-12-03T19:00:00', '2026-02-30T19:00:00+09:00', '2026-12-03T24:00:00+09:00',
    '2026-12-03T19:00:00+25:00', '2026-12-03', 123, null]) assert.equal(parseTimestamp(v), null, String(v));
});

test('startsAt만으로 등록', () => {
  assert.deepEqual(parseCreate(valid), { title: null, description: null, endsAt: null, platform: null,
    meetingUrl: null, timezone: 'Asia/Seoul', startsAt: new Date('2026-12-03T10:00:00.000Z') });
});

test('빈 문자열과 null은 null', () => {
  const r = parseCreate({ ...valid, title: '  ', description: '', platform: null, meetingUrl: ' ', endsAt: null });
  for (const k of ['title', 'description', 'platform', 'meetingUrl', 'endsAt']) assert.equal(r[k], null, k);
});

test('시간대는 표준 표기로', () => {
  assert.equal(parseCreate({ ...valid, timezone: 'asia/seoul' }).timezone, 'Asia/Seoul');
  assert.equal(parseCreate({ ...valid, timezone: 'UTC' }).timezone, 'UTC');
});

test('객체가 아니거나 빈 본문', () => {
  for (const v of [undefined, null, [], 'x', {}]) bad(() => parseCreate(v), String(v));
});

test('등록 거절', () => {
  for (const patch of [{ platform: 'TEAMS' }, { startsAt: '2026-12-03T19:00:30+09:00' },
    { startsAt: '2026-12-03T19:00:00.001+09:00' }, { endsAt: '2026-12-03T19:00:00+09:00' },
    { title: 'a'.repeat(101) }, { title: 1 }, { description: 'a'.repeat(1001) },
    { timezone: '+09:00' }, { timezone: 'Mars/Base' }, { timezone: '' }, { timezone: null },
    { projectId: 'x' }, { updatedAt: base }]) bad(() => parseCreate({ ...valid, ...patch }), JSON.stringify(patch));
});

test('허용 경계', () => {
  parseCreate({ ...valid, platform: 'ZEP', title: 'a'.repeat(100), description: 'a'.repeat(1000),
    meetingUrl: 'https://a.co/' + 'a'.repeat(500 - 13) });
  assert.equal(parseCreate({ ...valid, meetingUrl: '  HTTPS://a.co/x  ' }).meetingUrl, 'HTTPS://a.co/x');
});

test('링크 거절', () => {
  for (const u of ['http://a.co', 'https:/a.co', 'javascript:alert(1)', 'https://u:p@a.co', 'https://',
    'https://a.co/' + 'a'.repeat(501 - 13)]) bad(() => parseCreate({ ...valid, meetingUrl: u }), u);
});

test('수정: 생략은 유지, null은 삭제', () => {
  const body = { baseUpdatedAt: base, title: null, description: '', endsAt: null, platform: null, meetingUrl: null };
  assert.deepEqual(parseUpdate(body).changes,
    { title: null, description: null, endsAt: null, platform: null, meetingUrl: null });
  assert.deepEqual(parseUpdate({ baseUpdatedAt: base, title: 'x' }).changes, { title: 'x' });
});

test('수정 거절', () => {
  for (const body of [{ baseUpdatedAt: base }, { title: 'x' }, { baseUpdatedAt: '2026-11-27T00:00:00Z', title: 'x' },
    { baseUpdatedAt: base, startsAt: null }, { baseUpdatedAt: base, timezone: null },
    { baseUpdatedAt: base, createdBy: 'x' }]) bad(() => parseUpdate(body), JSON.stringify(body));
});

test('삭제 기준값 거절', () => {
  for (const v of [undefined, [base, base], '2026-11-27T00:00:00Z']) bad(() => parseBaseUpdatedAt(v), String(v));
});

test('목록 범위', () => {
  const now = new Date(base);
  assert.deepEqual(parseListQuery({}, now), { from: now, to: new Date('2026-12-27T00:00:00.000Z') });
  bad(() => parseListQuery({ from: base, to: base }, now));
  bad(() => parseListQuery({ from: base, to: '2027-11-29T00:00:00Z' }, now));
  bad(() => parseListQuery({ from: [base, base] }, now));
});

test('문자열의 NUL 문자와 링크 안의 공백·줄바꿈은 거절', () => {
  for (const patch of [{ title: 'a\u0000b' }, { description: 'a\u0000b' },
    { meetingUrl: 'https://a.co/x y' }, { meetingUrl: 'https://a.c\no/x' }]) {
    bad(() => parseCreate({ ...valid, ...patch }), JSON.stringify(patch));
  }
});

test('틀린 필드를 모두 알려준다', () => {
  assert.throws(() => parseCreate({ platform: 'TEAMS', extra: 1 }), (error) => {
    assert.deepEqual(error.details.fields.map((f) => f.field).sort(), ['extra', 'platform', 'startsAt']);
    return true;
  });
});
