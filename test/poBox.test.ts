import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  validateIdea, withinRateLimit, msUntilNextAllowed, readRateRecord, writeRateRecord,
  MIN_DWELL_MS, TITLE_MAX, DESCRIPTION_MAX,
} from '../src/lib/poBox';

const HOUR = 60 * 60 * 1000;
const goodDraft = {
  title: 'Add a bodyweight program',
  description: 'Please add a bodyweight-only program option.',
  honeypot: '',
  dwellMs: MIN_DWELL_MS + 1000,
};

test('validateIdea: accepts a well-formed idea', () => {
  assert.deepEqual(validateIdea(goodDraft), { ok: true });
});

test('validateIdea: rejects a filled honeypot', () => {
  assert.equal(validateIdea({ ...goodDraft, honeypot: 'http://spam.example' }).ok, false);
});

test('validateIdea: rejects an instant (bot-speed) submit', () => {
  assert.equal(validateIdea({ ...goodDraft, dwellMs: 500 }).ok, false);
});

test('validateIdea: requires a title and a long-enough description', () => {
  assert.equal(validateIdea({ ...goodDraft, title: '   ' }).ok, false);
  assert.equal(validateIdea({ ...goodDraft, description: 'short' }).ok, false);
});

test('validateIdea: enforces the max lengths', () => {
  assert.equal(validateIdea({ ...goodDraft, title: 'x'.repeat(TITLE_MAX + 1) }).ok, false);
  assert.equal(validateIdea({ ...goodDraft, description: 'x'.repeat(DESCRIPTION_MAX + 1) }).ok, false);
});

test('msUntilNextAllowed: no prior submission means allowed now', () => {
  assert.equal(msUntilNextAllowed(null, 1000, 24), 0);
  assert.equal(withinRateLimit(null, 1000, 24), false);
});

test('msUntilNextAllowed: blocks inside the window, frees once it passes', () => {
  const now = 100 * HOUR;
  const rec = { atMs: now, ip: '1.2.3.4' };
  assert.equal(withinRateLimit(rec, now + HOUR, 24), true);
  assert.equal(msUntilNextAllowed(rec, now + HOUR, 24), 23 * HOUR);
  assert.equal(withinRateLimit(rec, now + 24 * HOUR, 24), false);
  assert.equal(withinRateLimit(rec, now + 25 * HOUR, 24), false);
});

test('msUntilNextAllowed: a backwards clock fails closed (keeps the full window)', () => {
  const rec = { atMs: 100 * HOUR, ip: null };
  assert.equal(msUntilNextAllowed(rec, 90 * HOUR, 24), 24 * HOUR);
});

test('rate record round-trips through localStorage; junk reads as null', () => {
  localStorage.clear();
  assert.equal(readRateRecord(), null);
  writeRateRecord({ atMs: 1234, ip: '9.9.9.9' });
  assert.deepEqual(readRateRecord(), { atMs: 1234, ip: '9.9.9.9' });
  localStorage.setItem('pobox_last_submit', 'not json');
  assert.equal(readRateRecord(), null);
});
