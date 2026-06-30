import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  validateProgramDraft, validateSetup, scaffoldDraft, materializeDraft, rpeFromPct, pbKey,
  MAX_WEEKS, MAX_DAYS_PER_WEEK,
} from '../src/lib/programDraft';
import type { Draft, SetupDraft } from '../src/lib/programDraft';

const NONE = new Set<string>();

const setup = (over: Partial<SetupDraft> = {}): SetupDraft =>
  ({ name: 'Block', weeks: '4', daysPerWeek: '3', deload: true, assumeRpe: true, ...over });

function validDraft(): Draft {
  return {
    name: 'My Block',
    style: 'build',
    progressable: true,
    weeks: [
      { week: '1', days: [
        { name: 'Day 1', isRest: false, sets: '3', reps: '5', pct: '75', pctRange: '', rpe: '', backoffs: [
          { sets: '3', reps: '5', pct: '70', pctRange: '' },
        ] },
        { name: 'Rest', isRest: true, sets: '', reps: '', pct: '', pctRange: '', rpe: '', backoffs: [] },
      ] },
    ],
  };
}

const errorKey = (draft: Draft, existing = NONE) => validateProgramDraft(draft, existing)?.key;

test('a fully valid draft passes', () => {
  assert.equal(validateProgramDraft(validDraft(), NONE), null);
});

test('name is required and must be unique', () => {
  const blank = validDraft();
  blank.name = '   ';
  assert.equal(errorKey(blank), pbKey.name);

  const dup = validDraft();
  dup.name = 'My Block';
  assert.equal(errorKey(dup, new Set(['my block'])), pbKey.name);

  assert.equal(validateProgramDraft(validDraft(), new Set(['something else'])), null);
});

test('at least one training day is required', () => {
  const draft = validDraft();
  draft.weeks[0].days[0].isRest = true;
  assert.equal(errorKey(draft), pbKey.dayRest(0, 0));
});

test('week label and day name are required', () => {
  const noWeek = validDraft();
  noWeek.weeks[0].week = '';
  assert.equal(errorKey(noWeek), pbKey.week(0));

  const noName = validDraft();
  noName.weeks[0].days[0].name = '  ';
  assert.equal(errorKey(noName), pbKey.dayName(0, 0));
});

test('sets must be a whole number in range', () => {
  for (const bad of ['', '0', '2.5', 'x', '99']) {
    const draft = validDraft();
    draft.weeks[0].days[0].sets = bad;
    assert.equal(errorKey(draft), pbKey.daySets(0, 0), `sets=${bad}`);
  }
});

test('reps accept a number or a comma list, but reject junk', () => {
  for (const bad of ['', '0', 'x', '5, x', '5,']) {
    const draft = validDraft();
    draft.weeks[0].days[0].reps = bad;
    assert.equal(errorKey(draft), pbKey.dayReps(0, 0), `reps=${bad}`);
  }

  const list = validDraft();
  list.weeks[0].days[0].reps = '5, 3, 1';
  assert.equal(validateProgramDraft(list, NONE), null);
});

test('percent must be a whole number, not a decimal fraction', () => {
  for (const bad of ['', '0', '0.75', '200']) {
    const draft = validDraft();
    draft.weeks[0].days[0].pct = bad;
    assert.equal(errorKey(draft), pbKey.dayPct(0, 0), `pct=${bad}`);
  }
});

test('the optional spread must be smaller than the percentage', () => {
  const tooBig = validDraft();
  tooBig.weeks[0].days[0].pctRange = '80';
  assert.equal(errorKey(tooBig), pbKey.dayRange(0, 0));

  const ok = validDraft();
  ok.weeks[0].days[0].pctRange = '5';
  assert.equal(validateProgramDraft(ok, NONE), null);
});

test('RPE is optional but must be 1-10 when present', () => {
  for (const bad of ['11', 'amrap', '0']) {
    const draft = validDraft();
    draft.weeks[0].days[0].rpe = bad;
    assert.equal(errorKey(draft), pbKey.dayRpe(0, 0), `rpe=${bad}`);
  }

  const range = validDraft();
  range.weeks[0].days[0].rpe = '7 - 8';
  assert.equal(validateProgramDraft(range, NONE), null);
});

test('backoff segments are validated like the main set', () => {
  const badSets = validDraft();
  badSets.weeks[0].days[0].backoffs[0].sets = '0';
  assert.equal(errorKey(badSets), pbKey.segSets(0, 0, 0));

  const badPct = validDraft();
  badPct.weeks[0].days[0].backoffs[0].pct = '';
  assert.equal(errorKey(badPct), pbKey.segPct(0, 0, 0));
});

test('checks stop at the first problem in reading order', () => {
  const draft = validDraft();
  draft.name = '';
  draft.weeks[0].days[0].sets = 'nonsense';
  assert.equal(errorKey(draft), pbKey.name);
});

test('rpeFromPct maps % bands to an RPE', () => {
  assert.equal(rpeFromPct(0.90), '9');
  assert.equal(rpeFromPct(0.85), '9');
  assert.equal(rpeFromPct(0.82), '8');
  assert.equal(rpeFromPct(0.77), '7.5');
  assert.equal(rpeFromPct(0.70), '7');
  assert.equal(rpeFromPct(0.60), '6');
});

test('scaffoldDraft builds weeks x days with linked ghosts and a light deload', () => {
  const d = scaffoldDraft(setup());
  assert.equal(d.weeks.length, 4);
  assert.equal(d.assumeRpe, true);
  assert.equal(d.weeks[0].days.length, 3);
  assert.equal(d.weeks[0].days[0].linked, undefined);
  assert.equal(d.weeks[0].days[0].pct, '70');
  assert.equal(d.weeks[1].days[0].linked, true);
  assert.equal(d.weeks[1].days[0].pct, '');
  assert.equal(d.weeks[3].isDeload, true);
  assert.equal(d.weeks[3].days[0].linked, undefined);
  assert.equal(d.weeks[3].days[0].pct, '60');
});

test('scaffoldDraft skips deload for a 1-week block and clamps huge inputs', () => {
  const oneWeek = scaffoldDraft(setup({ weeks: '1', daysPerWeek: '2' }));
  assert.equal(oneWeek.weeks.length, 1);
  assert.equal(oneWeek.weeks[0].isDeload, false);

  const huge = scaffoldDraft(setup({ weeks: '99', daysPerWeek: '99' }));
  assert.equal(huge.weeks.length, MAX_WEEKS);
  assert.equal(huge.weeks[0].days.length, MAX_DAYS_PER_WEEK);
});

test('materializeDraft resolves linked days with the bump and fills RPE', () => {
  const d = scaffoldDraft(setup({ assumeRpe: true }));
  d.weeks[1].days[0].pctBump = 5;
  const m = materializeDraft(d);
  assert.equal(m.weeks[1].days[0].linked, false);
  assert.equal(m.weeks[1].days[0].pct, '75');
  assert.equal(m.weeks[1].days[0].rpe, '7.5');
  assert.equal(m.weeks[0].days[0].rpe, '7');
  assert.equal(m.weeks[3].days[0].rpe, '6');
});

test('materializeDraft without assumeRpe leaves RPE blank', () => {
  const m = materializeDraft(scaffoldDraft(setup({ assumeRpe: false })));
  assert.equal(m.weeks[1].days[0].pct, '70');
  assert.equal(m.weeks[1].days[0].rpe, '');
});

test('validateSetup checks the name and the week/day bounds', () => {
  assert.equal(validateSetup(setup(), NONE), null);
  assert.equal(validateSetup(setup({ name: '' }), NONE)?.key, pbKey.name);
  assert.equal(validateSetup(setup(), new Set(['block']))?.key, pbKey.name);
  assert.equal(validateSetup(setup({ weeks: '0' }), NONE)?.key, pbKey.setupWeeks);
  assert.equal(validateSetup(setup({ weeks: 'x' }), NONE)?.key, pbKey.setupWeeks);
  assert.equal(validateSetup(setup({ daysPerWeek: '0' }), NONE)?.key, pbKey.setupDays);
});

test('assumeRpe makes validation ignore the RPE field', () => {
  const d = validDraft();
  d.weeks[0].days[0].rpe = 'garbage';
  assert.equal(errorKey(d), pbKey.dayRpe(0, 0));
  d.assumeRpe = true;
  assert.equal(validateProgramDraft(d, NONE), null);
});

test('linked days only fail when the effective % leaves the valid range', () => {
  const d = scaffoldDraft(setup());
  assert.equal(validateProgramDraft(d, NONE), null);
  d.weeks[1].days[0].pctBump = 90;
  assert.equal(errorKey(d), pbKey.dayPct(1, 0));
});
