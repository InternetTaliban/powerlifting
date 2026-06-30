import { test } from 'vitest';
import assert from 'node:assert/strict';
import { todayHasIncompleteWorkout, todayFabEligible, todayNavShouldHighlight } from '../src/lib/todayStatus';
import { formatDate } from '../src/util/date';
import { setLoose } from './helpers';

const TODAY = formatDate(new Date());

function seed(fabToday: boolean, calendar: Record<string, string>, completed: Record<string, boolean>): void {
  setLoose({
    global: { nav: { fabs: { today: fabToday, scrollTop: true, goToTraining: true } } },
    calendar,
    completed,
  });
}

test('todayHasIncompleteWorkout: false with nothing scheduled today', () => {
  seed(false, { 'sq-w0-d0': '2000-01-01' }, {});
  assert.equal(todayHasIncompleteWorkout(), false);
});

test('todayHasIncompleteWorkout: true when a workout dated today is not completed', () => {
  seed(false, { 'sq-w0-d0': TODAY }, {});
  assert.equal(todayHasIncompleteWorkout(), true);
});

test('todayHasIncompleteWorkout: false when every workout dated today is completed', () => {
  seed(false, { 'sq-w0-d0': TODAY }, { 'sq-w0-d0': true });
  assert.equal(todayHasIncompleteWorkout(), false);
});

test('todayNavShouldHighlight: highlights an unfinished today only when the FAB is off', () => {
  seed(false, { 'sq-w0-d0': TODAY }, {});
  assert.equal(todayFabEligible(), false);
  assert.equal(todayNavShouldHighlight(), true);
});

test('todayNavShouldHighlight: never highlights while the Today FAB is doing the job', () => {
  seed(true, { 'sq-w0-d0': TODAY }, {});
  assert.equal(todayFabEligible(), true);
  assert.equal(todayNavShouldHighlight(), false);
});

test('todayNavShouldHighlight: no highlight when today has no unfinished workout', () => {
  seed(false, { 'sq-w0-d0': TODAY }, { 'sq-w0-d0': true });
  assert.equal(todayNavShouldHighlight(), false);

  seed(true, {}, {});
  assert.equal(todayNavShouldHighlight(), false);
});
