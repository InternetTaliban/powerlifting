import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  platesPerSide, platesRounded, effectiveDenoms, plateHeight, plateWidth, formatPlateNum,
} from '../src/lib/plates';
import { plain } from './helpers';

test('effectiveDenoms: 25 kg plate is included by default', () => {
  assert.deepStrictEqual(plain(effectiveDenoms('kg', {})), [25, 20, 15, 10, 5, 2.5, 1.25]);
  assert.deepStrictEqual(plain(effectiveDenoms('kg', { allow25: true })), [25, 20, 15, 10, 5, 2.5, 1.25]);
});

test('effectiveDenoms: allow25=false drops only the 25 kg plate', () => {
  assert.deepStrictEqual(plain(effectiveDenoms('kg', { allow25: false })), [20, 15, 10, 5, 2.5, 1.25]);
});

test('effectiveDenoms: the toggle is kg-only — lbs keeps its 25 lb plate', () => {
  assert.deepStrictEqual(plain(effectiveDenoms('lbs', { allow25: false })), [45, 35, 25, 10, 5, 2.5]);
});

test('platesPerSide: greedy exact load (100 kg = 25 + 15 per side)', () => {
  const r = platesPerSide(100, 'kg');
  assert.deepStrictEqual(plain(r.plates), [25, 15]);
  assert.equal(r.achieved, 100);
  assert.equal(r.remainder, 0);
  assert.equal(r.loadable, true);
});

test('platesPerSide: without 25s, 100 kg loads as 20 + 20 per side', () => {
  const r = platesPerSide(100, 'kg', { allow25: false });
  assert.deepStrictEqual(plain(r.plates), [20, 20]);
  assert.equal(r.achieved, 100);
});

test('platesPerSide: stacks repeats of the heaviest plate (140 kg)', () => {
  const r = platesPerSide(140, 'kg');
  assert.deepStrictEqual(plain(r.plates), [25, 25, 10]);
  assert.equal(r.achieved, 140);
});

test('platesPerSide: empty bar and below-bar loads', () => {
  const empty = platesPerSide(20, 'kg');
  assert.deepStrictEqual(plain(empty.plates), []);
  assert.equal(empty.loadable, true);

  const under = platesPerSide(15, 'kg');
  assert.deepStrictEqual(plain(under.plates), []);
  assert.equal(under.loadable, false);
});

test('platesPerSide: lbs uses the 45 lb bar and plates', () => {
  const r = platesPerSide(135, 'lbs');
  assert.deepStrictEqual(plain(r.plates), [45]);
  assert.equal(r.achieved, 135);
});

test('platesRounded: an exactly loadable target collapses to one result', () => {
  const r = platesRounded(100, 'kg');
  assert.equal(r.exact, true);
  assert.equal(r.down.achieved, 100);
  assert.equal(r.up.achieved, 100);
});

test('platesRounded: an in-between target brackets down and up by one step', () => {
  const r = platesRounded(97.9, 'kg');
  assert.equal(r.exact, false);
  assert.equal(r.down.achieved, 97.5);
  assert.equal(r.up.achieved, 100);
  assert.ok(r.down.achieved <= 97.9 && r.up.achieved >= 97.9);
  assert.equal(r.up.achieved - r.down.achieved, 2.5);
});

test('platesRounded: dropping 25s still rounds 97.9 to 97.5 / 100', () => {
  const r = platesRounded(97.9, 'kg', { allow25: false });
  assert.equal(r.exact, false);
  assert.equal(r.down.achieved, 97.5);
  assert.equal(r.up.achieved, 100);
});

test('platesRounded: below the bar is treated as exact (nothing to round)', () => {
  const r = platesRounded(15, 'kg');
  assert.equal(r.exact, true);
  assert.equal(r.down.loadable, false);
});

test('plateHeight: per-denomination ratio of the max height', () => {
  assert.equal(plateHeight(25, 'kg'), 88);
  assert.equal(plateHeight(20, 'kg'), 88);
  assert.equal(plateHeight(15, 'kg'), 78);
  assert.equal(plateHeight(10, 'kg'), 63);
  assert.equal(plateHeight(5, 'kg'), 45);
  assert.equal(plateHeight(2.5, 'kg'), 37);
  assert.equal(plateHeight(1.25, 'kg'), 32);
});

test('plateHeight: lbs maps the ratios by rank (the two biggest at full height)', () => {
  assert.equal(plateHeight(45, 'lbs'), 88);
  assert.equal(plateHeight(35, 'lbs'), 88);
  assert.equal(plateHeight(25, 'lbs'), 78);
  assert.equal(plateHeight(2.5, 'lbs'), 37);
});

test('plateWidth: 25 kg at full width, the rest a tuned fraction', () => {
  assert.equal(plateWidth(25), 16);
  assert.equal(plateWidth(20), 13.76);
  assert.equal(plateWidth(15), 10.72);
  assert.equal(plateWidth(10), 9.6);
  assert.equal(plateWidth(5), 7.2);
  assert.equal(plateWidth(2.5), 5.28);
  assert.equal(plateWidth(1.25), 4.96);
});

test('plateWidth: keyed by denomination value, so big lbs plates stay full width', () => {
  assert.equal(plateWidth(45), 16);
  assert.equal(plateWidth(35), 16);
  assert.equal(plateWidth(10), 9.6);
});

test('formatPlateNum: trims trailing zeros', () => {
  assert.equal(formatPlateNum(20), '20');
  assert.equal(formatPlateNum(2.5), '2.5');
  assert.equal(formatPlateNum(1.25), '1.25');
});
