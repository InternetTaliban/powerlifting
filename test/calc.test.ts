import { test } from 'vitest';
import assert from 'node:assert/strict';
import { calculateWeight, getRepModifier, convertMaxGymMath, resolveRowMax, roughWeight } from '../src/lib/calc';
import { getState } from '../src/lib/state';
import { setLoose } from './helpers';

// calc reads the shared `state` (unit, rounding, rep modifiers), so each test
// installs a controlled state via setLoose.
function useState({ unit = 'kg', rounding = 'exact', lifts, activeLift = 'bench' }: {
  unit?: string; rounding?: string; lifts?: Record<string, unknown>; activeLift?: string;
} = {}) {
  setLoose({ global: { unit, rounding }, activeLift, lifts: lifts || { bench: {} } });
}

test('calculateWeight: exact rounding returns 2-decimal raw load', () => {
  useState({ rounding: 'exact' });
  assert.equal(calculateWeight(100, 0.8), '80.00');
  assert.equal(calculateWeight(137, 0.725), (137 * 0.725).toFixed(2));
});

test('calculateWeight: a rep count with zero modifiers does not shift the load', () => {
  useState({ rounding: 'exact', lifts: { bench: { repModifiers: { singles: 0, triples: 0, volume: 0 } } } });
  assert.equal(calculateWeight(100, 0.8, 5), '80.00');
});

test('calculateWeight: the Math.max(0.01, ...) floor clamps absurd negatives', () => {
  useState({ rounding: 'exact' });
  assert.equal(calculateWeight(100, -5), '1.00');
  useState({ rounding: 'exact', lifts: { bench: { repModifiers: { singles: -200, triples: 0, volume: 0 } } } });
  assert.equal(calculateWeight(100, 0.5, 1), '1.00');
});

test('calculateWeight: kg rounds to 2.5 steps, down and up', () => {
  useState({ unit: 'kg', rounding: 'down' });
  assert.equal(calculateWeight(100, 0.811), '80.0');
  useState({ unit: 'kg', rounding: 'up' });
  assert.equal(calculateWeight(100, 0.801), '82.5');
});

test('calculateWeight: lbs rounds to 5 steps, down and up', () => {
  useState({ unit: 'lbs', rounding: 'down' });
  assert.equal(calculateWeight(225, 0.81), '180.0');
  useState({ unit: 'lbs', rounding: 'up' });
  assert.equal(calculateWeight(225, 0.81), '185.0');
});

test('calculateWeight: epsilon keeps an exact step from drifting a notch', () => {
  useState({ unit: 'kg', rounding: 'down' });
  assert.equal(calculateWeight(100, 0.8), '80.0');
  useState({ unit: 'kg', rounding: 'up' });
  assert.equal(calculateWeight(100, 0.8), '80.0');
});

test('calculateWeight: rep modifier offsets the percentage by rep range', () => {
  useState({ rounding: 'exact', lifts: { bench: { repModifiers: { singles: 10, triples: 0, volume: 0 } } } });
  assert.equal(calculateWeight(100, 0.8, 1), '90.00');
  assert.equal(calculateWeight(100, 0.8, 3), '80.00');
  assert.equal(calculateWeight(100, 0.8, 8), '80.00');
});

test('roughWeight: rounds the centre load to a whole number', () => {
  useState({});
  assert.equal(roughWeight(100, 0.89), '89');
  assert.equal(roughWeight(130, 0.89), '116');
});

test('roughWeight: ignores the kg/lb step and the rounding preference', () => {
  useState({ unit: 'kg', rounding: 'down' });
  assert.equal(roughWeight(100, 0.811), '81');
  useState({ unit: 'kg', rounding: 'up' });
  assert.equal(roughWeight(100, 0.811), '81');
});

test("roughWeight: sits between a pct +/- range's two detailed bounds", () => {
  useState({ rounding: 'exact' });
  const low = Number(calculateWeight(130, 0.89 - 0.02));
  const high = Number(calculateWeight(130, 0.89 + 0.02));
  const mid = Number(roughWeight(130, 0.89));
  assert.ok(low <= mid && mid <= high, `${low} <= ${mid} <= ${high}`);
});

test('roughWeight: applies the rep modifier like calculateWeight', () => {
  useState({ rounding: 'exact', lifts: { bench: { repModifiers: { singles: 10, triples: 0, volume: 0 } } } });
  assert.equal(roughWeight(100, 0.8, 1), '90');
  assert.equal(roughWeight(100, 0.8, 8), '80');
});

test('roughWeight: clamps absurd negatives via the 0.01 floor', () => {
  useState({ rounding: 'exact' });
  assert.equal(roughWeight(100, -5), '1');
});

test('getRepModifier: non-numeric reps and missing modifiers yield 0', () => {
  useState({ lifts: { bench: {} } });
  assert.equal(getRepModifier('x'), 0);
  assert.equal(getRepModifier(undefined), 0);
  assert.equal(getRepModifier(5), 0);
});

test('getRepModifier: maps reps to singles (1), triples (2-3), volume (4+)', () => {
  useState({ lifts: { bench: { repModifiers: { singles: 10, triples: 20, volume: 30 } } } });
  assert.equal(getRepModifier(1), 0.1);
  assert.equal(getRepModifier(2), 0.2);
  assert.equal(getRepModifier(3), 0.2);
  assert.equal(getRepModifier(4), 0.3);
  assert.equal(getRepModifier(12), 0.3);
});

test('getRepModifier: the lift argument overrides the active lift', () => {
  useState({
    activeLift: 'bench',
    lifts: {
      bench: { repModifiers: { singles: 10, triples: 0, volume: 0 } },
      ohp: { repModifiers: { singles: 50, triples: 0, volume: 0 } },
    },
  });
  assert.equal(getRepModifier(1), 0.1);
  assert.equal(getRepModifier(1, 'ohp'), 0.5);
});

test('convertMaxGymMath: kg -> lbs uses gym (plate) math, not 2.2046', () => {
  assert.equal(convertMaxGymMath(60, 'kg'), 135);
  assert.equal(convertMaxGymMath(100, 'kg'), 225);
  assert.equal(convertMaxGymMath(140, 'kg'), 315);
});

test('convertMaxGymMath: lbs -> kg is the inverse plate math', () => {
  assert.equal(convertMaxGymMath(135, 'lbs'), 60);
  assert.equal(convertMaxGymMath(225, 'lbs'), 100);
  assert.equal(convertMaxGymMath(315, 'lbs'), 140);
});

test('convertMaxGymMath: bar-loadable values round-trip kg -> lbs -> kg', () => {
  for (const kg of [60, 100, 102.5, 140, 180]) {
    assert.equal(convertMaxGymMath(convertMaxGymMath(kg, 'kg'), 'lbs'), kg, `kg=${kg}`);
  }
});

test('convertMaxGymMath: sub-bar input returns the empty bar weight', () => {
  assert.equal(convertMaxGymMath(10, 'kg'), 45);
  assert.equal(convertMaxGymMath(10, 'lbs'), 20);
  assert.equal(convertMaxGymMath(20, 'kg'), 45);
});

test('convertMaxGymMath: non-loadable input is lossy (documented behavior)', () => {
  assert.equal(convertMaxGymMath(101, 'kg'), convertMaxGymMath(100, 'kg'));
});

test('resolveRowMax: a valid override wins over a pinned max and the lift max', () => {
  useState({ lifts: { bench: { max: 100 } } });
  getState().loggedMax = { 'bench-prog-w0-d0': 140 };
  assert.equal(resolveRowMax('bench', 'bench-prog-w0-d0', 150), 150);
  assert.equal(resolveRowMax('bench', 'bench-prog-w0-d0', '150'), 150);
});

test('resolveRowMax: a pinned loggedMax is used when there is no override', () => {
  useState({ lifts: { bench: { max: 100 } } });
  getState().loggedMax = { 'bench-prog-w0-d0': 142.5 };
  assert.equal(resolveRowMax('bench', 'bench-prog-w0-d0'), 142.5);
  assert.equal(resolveRowMax('bench', 'bench-prog-w0-d0', ''), 142.5);
  assert.equal(resolveRowMax('bench', 'bench-prog-w0-d0', 'abc'), 142.5);
});

test('resolveRowMax: falls back to the lift current max when the row is not pinned', () => {
  useState({ lifts: { bench: { max: 100 } } });
  getState().loggedMax = { 'some-other-row': 200 };
  assert.equal(resolveRowMax('bench', 'bench-prog-w0-d0'), 100);
});

test('resolveRowMax: tolerates a missing loggedMax map entirely', () => {
  useState({ lifts: { bench: { max: 110 } } }); // setLoose does not set loggedMax
  assert.equal(resolveRowMax('bench', 'anything'), 110);
});
