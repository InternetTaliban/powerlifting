import { test } from 'vitest';
import assert from 'node:assert/strict';
import { normalizeState } from '../src/lib/state';
import { defaultState, muscleGroups, pullupPrograms } from '../src/lib/data';
import type { NormalizeReport } from '../src/lib/types';
import { plain, loadWith } from './helpers';

test('normalizeState: backfills a full schema from an empty object', () => {
  const s: any = {};
  assert.equal(normalizeState(s), true);

  assert.deepEqual(plain(s.exercises), ['squat', 'bench', 'deadlift', 'ohp']);
  assert.equal(s.global.unit, 'kg');
  assert.equal(s.global.rounding, 'exact');
  assert.equal(s.global.navPosition, 'top');
  assert.equal(s.global.backPosition, 'bottom');
  assert.equal(s.global.dialogOffset, 65);
  assert.equal(s.global.roughLoads, false);
  assert.equal(s.global.showLoadsToggle, false);
  assert.equal(s.activeLift, 'squat');

  for (const k of [
    'completed', 'calendar', 'logged', 'loggedMax', 'customWorkouts', 'allowedVariations', 'increments',
  ]) {
    assert.equal(typeof s[k], 'object', `${k} should be initialized`);
  }
  assert.equal(s.fatigue.peripheralFactor, 0.5);
  assert.equal(s.fatigue.week, 0);
  assert.deepEqual(Object.keys(s.fatigue.tolerance).sort(), [...muscleGroups].sort());
  assert.deepEqual(Object.keys(s.fatigue.muscleMap).sort(), ['bench', 'deadlift', 'ohp', 'squat']);
});

test('normalizeState: is idempotent (a second pass reports no changes)', () => {
  const s: any = {};
  normalizeState(s);
  assert.equal(normalizeState(s), false);
});

test('defaultState: ships the coach default program and design', () => {
  const d = plain(defaultState);

  assert.deepEqual(d.exercises, ['squat', 'bench', 'deadlift', 'ohp', 'pullup']);

  assert.deepEqual(d.lifts.squat, { max: 140, program: 'rpe_2day', variation: 1, block: 0 });
  assert.deepEqual(d.lifts.bench, { max: 100, program: 'peaking', variation: 0, block: 0 });
  assert.deepEqual(d.lifts.deadlift, { max: 180, program: 'rpe_2day', variation: 0, block: 0 });
  assert.deepEqual(d.lifts.ohp, { max: 60, program: 'building', variation: 2, block: 0 });
  assert.deepEqual(d.lifts.pullup, { max: 40, program: 'pullup_double', variation: 0, block: 0 });

  assert.equal(d.variationsDict.squat[1], 'Pause Squat');
  assert.equal(d.variationsDict.deadlift[0], 'Main Deadlift');
  assert.equal(d.variationsDict.ohp[2], 'Close Grip OHP');
  assert.deepEqual(plain(d.allowedPrograms.pullup), plain(pullupPrograms));

  const L = d.global.nav.layout;
  for (const k of ['today', 'pobox']) {
    assert.equal(L[k], 'top', k);
  }
  for (const k of ['schedule', 'rpe', 'planner', 'settings']) {
    assert.equal(L[k], 'bottom', k);
  }
  assert.equal(L.fatigue, 'hidden');
  assert.equal(d.global.nav.fabs.today, true);
  assert.equal(d.global.controls.layout.adjust, 'hidden');
  assert.equal(d.global.controls.layout.loads, 'hidden');
  assert.equal(d.global.backPosition, 'bottom');
});

test('normalizeState: defaults roughLoads off but preserves an explicit choice', () => {
  const off: any = {};
  normalizeState(off);
  assert.equal(off.global.roughLoads, false);

  const on: any = { global: { roughLoads: true } };
  normalizeState(on);
  assert.equal(on.global.roughLoads, true);
});

test('normalizeState: strips programs invalid for the exercise type', () => {
  const s: any = {
    exercises: ['bench'],
    lifts: { bench: { program: 'building', variation: 0, block: 0 } },
    allowedPrograms: { bench: ['building', 'pullup_double', 'peaking'] },
  };
  normalizeState(s);
  assert.deepEqual(plain(s.allowedPrograms.bench), ['building', 'peaking']);
});

test('normalizeState: a pullup keeps only pullup programs', () => {
  const s: any = {
    exercises: ['pullup'],
    lifts: { pullup: { program: 'pullup_double', variation: 0, block: 0 } },
    allowedPrograms: { pullup: ['pullup_double', 'building', 'pullup_peak'] },
    variationsDict: { pullup: ['Weighted Pullup'] },
  };
  normalizeState(s);
  assert.deepEqual(plain(s.allowedPrograms.pullup), ['pullup_double', 'pullup_peak']);
});

test('normalizeState: resets an out-of-pool current program and prunes its calendar', () => {
  const s: any = {
    exercises: ['bench'],
    lifts: { bench: { program: 'pullup_double', variation: 0, block: 0 } },
    allowedPrograms: { bench: ['building', 'peaking'] },
    calendar: { 'bench-pullup_double-w0-d0': '2026-01-01', 'bench-building-w0-d0': '2026-01-02' },
  };
  normalizeState(s);
  assert.equal(s.lifts.bench.program, 'building');
  assert.ok(!('bench-pullup_double-w0-d0' in s.calendar));
  assert.equal(s.calendar['bench-building-w0-d0'], '2026-01-02');
});

test('normalizeState: drops calendar entries that are not a date or "hidden"', () => {
  const s: any = { calendar: { a: 'garbage', b: '2026-03-04', c: 'hidden' } };
  normalizeState(s);
  assert.ok(!('a' in s.calendar));
  assert.equal(s.calendar.b, '2026-03-04');
  assert.equal(s.calendar.c, 'hidden');
});

test('normalizeState: validates custom workouts and clears their orphans', () => {
  const s: any = {
    customWorkouts: {
      'cw-1': { name: 'Row 5k' },
      'cw-2': { name: '   ' },
      'cw-3': { name: 'Yoga', note: 'evening' },
    },
    calendar: { 'cw-1': '2026-02-02', 'cw-9': '2026-02-03' },
    completed: { 'cw-2': true },
  };
  normalizeState(s);
  assert.equal(s.customWorkouts['cw-1'].note, '');
  assert.ok(!('cw-2' in s.customWorkouts));
  assert.equal(s.customWorkouts['cw-3'].note, 'evening');
  assert.equal(s.calendar['cw-1'], '2026-02-02');
  assert.ok(!('cw-9' in s.calendar));
  assert.ok(!('cw-2' in s.completed));
});

test('normalizeState: repairs invalid fatigue values', () => {
  const s: any = { fatigue: { peripheralFactor: -2, week: 'oops', muscleMap: {}, tolerance: {} } };
  normalizeState(s);
  assert.equal(s.fatigue.peripheralFactor, 0.5);
  assert.equal(s.fatigue.week, 0);
});

test('normalizeState: backfills loggedMax and preserves an existing one', () => {
  const empty: any = {};
  normalizeState(empty);
  assert.deepEqual(plain(empty.loggedMax), {});

  const s: any = { loggedMax: { 'bench-building-w0-d0': 142.5 } };
  normalizeState(s);
  assert.equal(s.loggedMax['bench-building-w0-d0'], 142.5);
});

test('normalizeState: sanitizes non-numeric logged / loggedMax values (import hardening)', () => {
  const s: any = {
    logged: {
      'bench-peaking-w0-d0': { main: 100, backoff: '<img src=x onerror=alert(1)>' },
      'bench-peaking-w0-d1': { main: 'evil' },
      'squat-rpe_2day-w0-d0': { main: NaN },
    },
    loggedMax: { 'bench-peaking-w0-d0': 142.5, 'squat-rpe_2day-w0-d0': 'bad' },
  };
  normalizeState(s);
  assert.equal(s.logged['bench-peaking-w0-d0'].main, 100);
  assert.ok(!('backoff' in s.logged['bench-peaking-w0-d0']));
  assert.ok(!('bench-peaking-w0-d1' in s.logged));
  assert.ok(!('squat-rpe_2day-w0-d0' in s.logged));
  assert.equal(s.loggedMax['bench-peaking-w0-d0'], 142.5);
  assert.ok(!('squat-rpe_2day-w0-d0' in s.loggedMax));
});

test('normalizeState: backfills and repairs per-exercise warm-up prefs', () => {
  const s: any = {
    exercises: ['bench', 'ohp'],
    warmup: { bench: { sets: 99, startPct: 0.99 } },
  };
  normalizeState(s);
  assert.deepEqual(plain(s.warmup.bench), { sets: 3, startPct: 0.4 });
  assert.deepEqual(plain(s.warmup.ohp), { sets: 3, startPct: 0.4 });
});


function prePullupSeed(): any {
  const seed: any = plain(defaultState);
  seed.exercises = ['squat', 'bench', 'deadlift', 'ohp'];
  for (const k of ['lifts', 'variationsDict', 'allowedPrograms', 'allowedVariations', 'increments']) {
    delete seed[k].pullup;
  }
  return seed;
}

test('load: pullup migration adds the pullup lift to a pre-pullup stored state', () => {
  const st = loadWith({ pl_state: JSON.stringify(prePullupSeed()) });
  assert.ok(st.exercises.includes('pullup'));
  assert.equal(st.lifts.pullup.program, 'pullup_double');
  assert.deepEqual(plain(st.allowedPrograms.pullup), plain(pullupPrograms));
  assert.equal(localStorage.getItem('pullup_migrated'), 'true');
});

test('load: pullup migration is skipped once its flag is set', () => {
  const st = loadWith({ pl_state: JSON.stringify(prePullupSeed()), pullup_migrated: 'true' });
  assert.ok(!st.exercises.includes('pullup'));
});

test('load: a brand-new visitor (no stored state) already has pullup as a default', () => {
  const st = loadWith({});
  assert.ok(st.exercises.includes('pullup'));
});

test('load: rpe_v2 migration appends the RPE programs to existing exercises', () => {
  const seed: any = plain(defaultState);
  seed.allowedPrograms.bench = ['building'];
  seed.lifts.bench.program = 'building';
  const st = loadWith({ pl_state: JSON.stringify(seed), pullup_migrated: 'true' });
  const bench = st.allowedPrograms.bench;
  assert.ok(bench.includes('rpe_3day'));
  assert.ok(bench.includes('rpe_2day'));
  assert.ok(bench.includes('rpe_peaking'));
  assert.equal(localStorage.getItem('rpe_v2_migrated'), 'true');
});

test('load: rpe_v2 migration is skipped once its flag is set', () => {
  const seed: any = plain(defaultState);
  seed.allowedPrograms.bench = ['building'];
  seed.lifts.bench.program = 'building';
  const st = loadWith({
    pl_state: JSON.stringify(seed),
    pullup_migrated: 'true', rpe_v2_migrated: 'true', host_defaults_v3_migrated: 'true',
  });
  assert.deepEqual(plain(st.allowedPrograms.bench), ['building']);
});


function reportFor(s: any): NormalizeReport {
  const report: NormalizeReport = { filled: [], issues: [] };
  normalizeState(s, report);
  return report;
}

function resolutionOf(report: NormalizeReport, setting: string): string {
  const issue = report.issues.find((i) => i.setting === setting);
  assert.ok(issue, `expected an incompatibility for "${setting}"`);
  return issue.resolution;
}

test('report: absent fields are filled with defaults, never flagged as incompatible', () => {
  const report = reportFor({});
  assert.equal(report.issues.length, 0);
  assert.ok(report.filled.length > 0);
});

test('report: a current export normalizes with no issues and no fills', () => {
  const report = reportFor(plain(defaultState));
  assert.equal(report.issues.length, 0);
  assert.equal(report.filled.length, 0);
});

test('report: an unknown unit is reset to default and reported', () => {
  const s: any = { global: { unit: 'stones' } };
  const report = reportFor(s);
  assert.equal(s.global.unit, 'kg');
  assert.equal(resolutionOf(report, 'Units'), 'default');
});

test('report: a unit with stray case/whitespace is recovered', () => {
  const s: any = { global: { unit: ' KG ' } };
  const report = reportFor(s);
  assert.equal(s.global.unit, 'kg');
  assert.equal(resolutionOf(report, 'Units'), 'recovered');
});

test('report: a numeric-string 1RM is salvaged to a number', () => {
  const s: any = {
    exercises: ['bench'],
    lifts: { bench: { max: '102.5', program: 'building', variation: 0, block: 0 } },
  };
  const report = reportFor(s);
  assert.equal(s.lifts.bench.max, 102.5);
  assert.equal(resolutionOf(report, 'Bench → 1RM'), 'recovered');
});

test('report: an unsalvageable 1RM resets to the lift default', () => {
  const s: any = {
    exercises: ['squat'],
    lifts: { squat: { max: 'heavy', program: 'building', variation: 0, block: 0 } },
  };
  const report = reportFor(s);
  assert.equal(s.lifts.squat.max, defaultState.lifts.squat.max);
  assert.equal(resolutionOf(report, 'Squat → 1RM'), 'default');
});

test('report: a program no longer valid for the lift is reset and reported', () => {
  const s: any = {
    exercises: ['bench'],
    lifts: { bench: { max: 100, program: 'pullup_double', variation: 0, block: 0 } },
    allowedPrograms: { bench: ['building', 'peaking'] },
  };
  const report = reportFor(s);
  assert.equal(s.lifts.bench.program, 'building');
  assert.ok(report.issues.some((i) => i.setting === 'Bench → program'));
});

test('report: invalid entries in an allowed-programs list are pruned and recovered', () => {
  const s: any = {
    exercises: ['bench'],
    lifts: { bench: { max: 100, program: 'building', variation: 0, block: 0 } },
    allowedPrograms: { bench: ['building', 'pullup_double', 'peaking'] },
  };
  const report = reportFor(s);
  assert.deepEqual(plain(s.allowedPrograms.bench), ['building', 'peaking']);
  assert.equal(resolutionOf(report, 'Bench → allowed programs'), 'recovered');
});

test('report: a variation index beyond the list is reset and reported', () => {
  const s: any = {
    exercises: ['bench'],
    variationsDict: { bench: ['Main Bench', 'Close Grip Bench'] },
    lifts: { bench: { max: 100, program: 'building', variation: 9, block: 0 } },
  };
  const report = reportFor(s);
  assert.equal(s.lifts.bench.variation, 0);
  assert.ok(report.issues.some((i) => i.setting === 'Bench → variation'));
});

test('report: corrupt logged values are dropped and reported in aggregate', () => {
  const s: any = { logged: { 'bench-peaking-w0-d0': { main: 100, backoff: 'oops' } } };
  const report = reportFor(s);
  assert.equal(s.logged['bench-peaking-w0-d0'].main, 100);
  assert.ok(report.issues.some((i) => i.setting.startsWith('Logged weights')));
});
