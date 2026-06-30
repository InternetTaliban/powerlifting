import { state, saveState } from './state';
import { programs, autoAssignMap, DAYS_PER_WEEK } from './data';
import type { SplitSlot } from './types';

export const slotKey = (ex: string, day: number): string => `${ex}:${day}`;

export function shortDayName(name: string): string {
  return (name || '').split('(')[0].trim();
}

export interface NamedSlot { ex: string; d: number; name: string; }

export function getAllSplitSlots(): NamedSlot[] {
  const slots: NamedSlot[] = [];

  for (const ex of state.exercises) {
    const program = state.lifts[ex] && state.lifts[ex].program;
    const firstWeek = programs[program] && programs[program][0];
    if (!firstWeek) {
      continue;
    }

    for (let dayIndex = 0; dayIndex < firstWeek.days.length; dayIndex++) {
      const day = firstWeek.days[dayIndex];
      if (day.isRest) {
        continue;
      }

      slots.push({ ex, d: dayIndex, name: shortDayName(day.name) });
    }
  }

  return slots;
}

export function buildDefaultMasterSplit(): Record<number, SplitSlot[]> {
  const split: Record<number, SplitSlot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (const ex of state.exercises) {
    const program = state.lifts[ex] && state.lifts[ex].program;
    const firstWeek = programs[program] && programs[program][0];
    if (!firstWeek) {
      continue;
    }

    const offsets = autoAssignMap[ex];
    let order = 0;

    for (let dayIndex = 0; dayIndex < firstWeek.days.length; dayIndex++) {
      const day = firstWeek.days[dayIndex];
      if (day.isRest) {
        continue;
      }

      const weekday = offsets && offsets[order] !== undefined ? offsets[order] : order % DAYS_PER_WEEK;
      split[weekday].push({ ex, d: dayIndex });
      order++;
    }
  }

  return split;
}

export function ensureMasterSplit(): void {
  if (!state.masterSplit || typeof state.masterSplit !== 'object') {
    state.masterSplit = buildDefaultMasterSplit();
    saveState();
    return;
  }

  const validKeys = new Set(getAllSplitSlots().map((slot) => slotKey(slot.ex, slot.d)));
  let changed = false;

  for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday++) {
    if (!Array.isArray(state.masterSplit[weekday])) {
      state.masterSplit[weekday] = [];
      changed = true;
      continue;
    }

    const cleaned = state.masterSplit[weekday].filter((slot) => slot && validKeys.has(slotKey(slot.ex, slot.d)));
    if (cleaned.length !== state.masterSplit[weekday].length) {
      state.masterSplit[weekday] = cleaned;
      changed = true;
    }
  }

  if (changed) {
    saveState();
  }
}

export function placedSlotKeys(): Set<string> {
  const placed = new Set<string>();

  for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday++) {
    (state.masterSplit?.[weekday] || []).forEach((slot) => placed.add(slotKey(slot.ex, slot.d)));
  }

  return placed;
}

export function hasAnyMasterSplit(): boolean {
  if (!state.masterSplit) {
    return false;
  }

  for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday++) {
    if ((state.masterSplit[weekday] || []).length > 0) {
      return true;
    }
  }

  return false;
}
