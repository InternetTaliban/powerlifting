import { test } from 'vitest';
import assert from 'node:assert/strict';
import { generateWarmups, warmupReps, topWorkingPct } from '../src/lib/calc';
import { setLoose } from './helpers';

function useState({ unit = 'kg', rounding = 'exact', program = 'building' } = {}) {
  setLoose({ global: { unit, rounding }, activeLift: 'bench', lifts: { bench: { program } } });
}

test('warmupReps: tapers reps down as the bar gets heavier', () => {
  assert.equal(warmupReps(0.40), 5);
  assert.equal(warmupReps(0.54), 5);
  assert.equal(warmupReps(0.55), 3);
  assert.equal(warmupReps(0.74), 3);
  assert.equal(warmupReps(0.75), 2);
  assert.equal(warmupReps(0.87), 2);
  assert.equal(warmupReps(0.88), 1);
  assert.equal(warmupReps(1.0), 1);
});

test('generateWarmups: evenly spaced ramp from startPct, all below the working set', () => {
  useState({ rounding: 'exact' });
  const steps = generateWarmups(100, 4, 0.4);
  assert.equal(steps.length, 4);
  assert.deepEqual(steps.map((s) => s.weight), [40, 55, 70, 85]);
  assert.deepEqual(steps.map((s) => s.reps), [5, 3, 3, 2]);
  assert.ok(steps[steps.length - 1].weight < 100, 'last warm-up stays below the working weight');
});

test('generateWarmups: weights honour unit/rounding via calculateWeight', () => {
  useState({ unit: 'kg', rounding: 'down' });
  assert.deepEqual(generateWarmups(102, 3, 0.4).map((s) => s.weight), [40, 60, 80]);
});

test('generateWarmups: clamps startPct into [0.1, 0.95]', () => {
  useState({ rounding: 'exact' });
  assert.equal(generateWarmups(100, 1, 5)[0].weight, 95);
  assert.equal(generateWarmups(100, 1, 0)[0].weight, 10);
});

test('generateWarmups: degenerate inputs yield no steps', () => {
  useState({ rounding: 'exact' });
  assert.deepEqual(generateWarmups(100, 0, 0.4), []);
  assert.deepEqual(generateWarmups(0, 3, 0.4), []);
  assert.deepEqual(generateWarmups(-50, 3, 0.4), []);
  assert.equal(generateWarmups(100, 2.9, 0.4).length, 2);
});

test('topWorkingPct: returns the heaviest working percentage in the program', () => {
  useState({ program: 'building' });
  assert.equal(topWorkingPct('bench'), 0.875);
});

test('topWorkingPct: unknown lift or program yields 0', () => {
  useState({ program: 'building' });
  assert.equal(topWorkingPct('nope'), 0);
  setLoose({ lifts: { bench: { program: 'does-not-exist' } } });
  assert.equal(topWorkingPct('bench'), 0);
});
