import { state } from './state';
import { formatDate } from '../util/date';

export function todayHasIncompleteWorkout(): boolean {
  if (!state.calendar) {
    return false;
  }
  const today = formatDate(new Date());
  const ids = Object.keys(state.calendar).filter((id) => state.calendar[id] === today);
  return ids.length > 0 && ids.some((id) => !state.completed[id]);
}

export function todayFabEligible(): boolean {
  return !!state.global.nav.fabs.today && todayHasIncompleteWorkout();
}

// The top/bottom nav's Today button is highlighted only to flag an unfinished
// workout the floating Today's Workout button isn't already advertising.
export function todayNavShouldHighlight(): boolean {
  return todayHasIncompleteWorkout() && !todayFabEligible();
}
