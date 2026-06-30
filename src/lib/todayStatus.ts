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
