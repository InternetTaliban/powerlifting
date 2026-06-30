import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  getProgram, getProgramName, customProgramKeys, programStyle, programProgressable, programHasBackoff,
} from '../src/lib/programLookup';
import { parseRowId } from '../src/lib/rowId';
import { setLoose } from './helpers';

function withCustom() {
  setLoose({
    exercises: ['bench'],
    lifts: { bench: { program: 'building', variation: 0, max: 100, block: 0 } },
    customPrograms: {
      cpabc123: {
        name: 'My Peak',
        style: 'peak',
        progressable: false,
        weeks: [
          { week: '1', days: [
            { name: 'Day 1', sets: 5, reps: 5, pct: 0.7 },
            { name: 'Day 2', sets: 1, reps: 1, pct: 0.9, backoff: { sets: 3, reps: 3, pct: 0.8 } },
          ] },
        ],
      },
    },
  });
}

test('getProgram resolves both built-in and custom keys', () => {
  withCustom();
  assert.ok(getProgram('building'));
  assert.equal(getProgram('cpabc123')!.length, 1);
  assert.equal(getProgram('nope'), undefined);
});

test('getProgramName falls back to the custom name, then the raw key', () => {
  withCustom();
  assert.equal(getProgramName('building'), 'Base Build (3-Day)');
  assert.equal(getProgramName('cpabc123'), 'My Peak');
  assert.equal(getProgramName('nope'), 'nope');
});

test('customProgramKeys lists the custom keys', () => {
  withCustom();
  assert.deepEqual(customProgramKeys(), ['cpabc123']);
});

test('programStyle / programProgressable use custom flags and built-in name rules', () => {
  withCustom();
  assert.equal(programStyle('cpabc123'), 'peak');
  assert.equal(programProgressable('cpabc123'), false);
  assert.equal(programStyle('building'), 'build');
  assert.equal(programProgressable('building'), true);
  assert.equal(programStyle('peaking'), 'peak');
  assert.equal(programProgressable('peaking'), false);
});

test('programHasBackoff is data-driven for built-in and custom programs', () => {
  withCustom();
  assert.equal(programHasBackoff('cpabc123'), true);
  assert.equal(programHasBackoff('building'), true);
  assert.equal(programHasBackoff('pullup_peak'), true);
  assert.equal(programHasBackoff('peaking'), false);
  assert.equal(programHasBackoff('pullup_double'), false);
});

test('parseRowId resolves a row keyed by a custom program', () => {
  withCustom();
  const parsed = parseRowId('bench-cpabc123-w0-d1');
  assert.ok(parsed);
  assert.equal(parsed!.ex, 'bench');
  assert.equal(parsed!.program, 'cpabc123');
  assert.equal(parsed!.week, 0);
  assert.equal(parsed!.day, 1);
});
