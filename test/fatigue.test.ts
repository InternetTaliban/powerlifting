import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  workingSetsForDay, weeklySetsForExercise, computeMuscleVolume, volumeZone, fmtSets, ensureFatigueState,
} from '../src/lib/fatigue';
import { muscleGroups, defaultMuscleMap } from '../src/lib/data';
import { getState } from '../src/lib/state';
import { plain, setLoose } from './helpers';

function useFatigueState(over: any = {}) {
  setLoose({
    exercises: over.exercises || ['bench'],
    lifts: over.lifts || { bench: { program: 'building' } },
    fatigue: {
      peripheralFactor: over.peripheralFactor ?? 0.5,
      week: 0,
      muscleMap: over.muscleMap || { bench: { primary: ['chest'], secondary: ['triceps'] } },
      tolerance: over.tolerance || {},
    },
  });
}

// `building` week 0 = 4 + 3 + (1 + 3 backoff) = 11 working sets.
const WEEK0 = 11;
// `building` week 3 (deload) = 3 + 3 + rest(0) = 6.
const WEEK3 = 6;

test('workingSetsForDay: rest days and missing days contribute nothing', () => {
  assert.equal(workingSetsForDay({ isRest: true } as any), 0);
  assert.equal(workingSetsForDay(null), 0);
  assert.equal(workingSetsForDay(undefined), 0);
});

test('workingSetsForDay: sums the main set plus every backoff block', () => {
  assert.equal(workingSetsForDay({ sets: 4 } as any), 4);
  assert.equal(
    workingSetsForDay({ sets: 1, backoff: { sets: 3 }, backoff2: { sets: 2 }, backoff3: { sets: 1 } } as any),
    7,
  );
});

test('workingSetsForDay: non-numeric set counts coerce to 0', () => {
  assert.equal(workingSetsForDay({ sets: 'x' } as any), 0);
  assert.equal(workingSetsForDay({ sets: 3, backoff: { sets: 'y' } } as any), 3);
});

test('weeklySetsForExercise: returns the program week total', () => {
  useFatigueState();
  assert.equal(weeklySetsForExercise('bench', 0), WEEK0);
  assert.equal(weeklySetsForExercise('bench', 3), WEEK3);
});

test('weeklySetsForExercise: clamps the week index to the program range', () => {
  useFatigueState();
  assert.equal(weeklySetsForExercise('bench', 99), weeklySetsForExercise('bench', 3));
  assert.equal(weeklySetsForExercise('bench', -5), weeklySetsForExercise('bench', 0));
});

test('weeklySetsForExercise: unknown exercise or program yields 0', () => {
  useFatigueState();
  assert.equal(weeklySetsForExercise('nope', 0), 0);
  useFatigueState({ lifts: { bench: { program: 'does-not-exist' } } });
  assert.equal(weeklySetsForExercise('bench', 0), 0);
});

test('computeMuscleVolume: primary muscles take full sets, secondary scaled by peripheral factor', () => {
  useFatigueState({ peripheralFactor: 0.5, muscleMap: { bench: { primary: ['chest'], secondary: ['triceps'] } } });
  const { totals, contributors } = computeMuscleVolume(0);
  assert.equal(totals.chest, WEEK0);
  assert.equal(totals.triceps, WEEK0 * 0.5);
  assert.deepEqual(plain(contributors.chest), [{ ex: 'bench', sets: WEEK0 }]);
  assert.deepEqual(plain(contributors.triceps), [{ ex: 'bench', sets: WEEK0 * 0.5 }]);
});

test('computeMuscleVolume: peripheral factor is configurable', () => {
  useFatigueState({ peripheralFactor: 0.25, muscleMap: { bench: { primary: ['chest'], secondary: ['triceps'] } } });
  assert.equal(computeMuscleVolume(0).totals.triceps, WEEK0 * 0.25);
});

test('computeMuscleVolume: exercises with zero sets do not contribute', () => {
  useFatigueState({
    exercises: ['bench', 'ghost'],
    lifts: { bench: { program: 'building' }, ghost: { program: 'does-not-exist' } },
    muscleMap: {
      bench: { primary: ['chest'], secondary: [] },
      ghost: { primary: ['back'], secondary: [] },
    },
  });
  const { totals } = computeMuscleVolume(0);
  assert.equal(totals.chest, WEEK0);
  assert.ok(!('back' in totals), 'ghost exercise (0 sets) must not seed a muscle total');
});

test('volumeZone: classifies against MEV / MRV landmarks', () => {
  assert.equal(volumeZone(0, 8, 22), 'none');
  assert.equal(volumeZone(-3, 8, 22), 'none');
  assert.equal(volumeZone(5, 8, 22), 'under');
  assert.equal(volumeZone(8, 8, 22), 'optimal');
  assert.equal(volumeZone(10, 8, 22), 'optimal');
  assert.equal(volumeZone(22, 8, 22), 'high');
  assert.equal(volumeZone(23, 8, 22), 'over');
  assert.equal(volumeZone(1000, 8, 22), 'over');
});

test('volumeZone: "high" starts at 85% of the way from MEV to MRV', () => {
  assert.equal(volumeZone(19.8, 8, 22), 'optimal');
  assert.equal(volumeZone(19.9, 8, 22), 'high');
});

test('volumeZone: a zero MRV disables the over/high bands', () => {
  assert.equal(volumeZone(5, 8, 0), 'under');
  assert.equal(volumeZone(50, 0, 0), 'optimal');
});

test('fmtSets: trims trailing .0 but keeps real halves, rounded to 1 dp', () => {
  assert.equal(fmtSets(12), '12');
  assert.equal(fmtSets(12.0), '12');
  assert.equal(fmtSets(0), '0');
  assert.equal(fmtSets(5.5), '5.5');
  assert.equal(fmtSets(5.25), '5.3');
});

test('ensureFatigueState: backfills a missing fatigue block from defaults', () => {
  setLoose({ exercises: ['bench'], lifts: { bench: {} } });
  ensureFatigueState();
  const f = getState().fatigue;
  assert.equal(f.peripheralFactor, 0.5);
  assert.equal(f.week, 0);
  assert.deepEqual(Object.keys(f.tolerance).sort(), [...muscleGroups].sort());
  assert.deepEqual(f.muscleMap.bench, defaultMuscleMap.bench);
});

test('ensureFatigueState: repairs an invalid peripheral factor', () => {
  setLoose({
    exercises: ['bench'], lifts: { bench: {} }, fatigue: { peripheralFactor: -1, muscleMap: {}, tolerance: {} },
  });
  ensureFatigueState();
  assert.equal(getState().fatigue.peripheralFactor, 0.5);
});

test('computeMuscleVolume: backoff sets follow the active variation muscle map', () => {
  setLoose({
    exercises: ['bench'],
    lifts: { bench: { program: 'building', variation: 1 } },
    fatigue: {
      peripheralFactor: 0.5,
      week: 0,
      muscleMap: { bench: { primary: ['chest'], secondary: [] } },
      variationMuscleMap: { bench: { 1: { primary: ['triceps'], secondary: [] } } },
      tolerance: {},
    },
  });

  const { totals } = computeMuscleVolume(0);
  // building week 0: main sets 4+3+1 = 8 → chest; backoff sets 3 → triceps.
  assert.equal(totals.chest, 8);
  assert.equal(totals.triceps, 3);
});

test('computeMuscleVolume: backoff falls back to exercise muscles without a variation map', () => {
  setLoose({
    exercises: ['bench'],
    lifts: { bench: { program: 'building', variation: 0 } },
    fatigue: {
      peripheralFactor: 0.5,
      week: 0,
      muscleMap: { bench: { primary: ['chest'], secondary: [] } },
      tolerance: {},
    },
  });

  const { totals } = computeMuscleVolume(0);
  // No variation map → all 11 sets (8 main + 3 backoff) count toward chest.
  assert.equal(totals.chest, 11);
});
