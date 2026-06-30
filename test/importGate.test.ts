import { test } from 'vitest';
import assert from 'node:assert/strict';
import { isImportableState } from '../src/store/actions';

test('isImportableState: accepts anything shaped like a BenchApp export', () => {
  assert.equal(isImportableState({ lifts: {} }), true);
  assert.equal(isImportableState({ exercises: [] }), true);
  assert.equal(isImportableState({ global: {} }), true);
});

test('isImportableState: rejects non-objects and unrecognizable JSON', () => {
  assert.equal(isImportableState(null), false);
  assert.equal(isImportableState(undefined), false);
  assert.equal(isImportableState('a string'), false);
  assert.equal(isImportableState(42), false);
  assert.equal(isImportableState([1, 2, 3]), false);
  assert.equal(isImportableState({ foo: 1 }), false);
});
