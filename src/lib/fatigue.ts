import { state } from './state';
import {
  programs, muscleGroups, defaultTolerance, defaultMuscleMap,
  DEFAULT_PERIPHERAL_FACTOR, NEAR_MRV_FRACTION,
} from './data';
import type { ProgramDay } from './types';

export type ZoneKey = 'none' | 'under' | 'optimal' | 'high' | 'over';

export function ensureFatigueState(): void {
  if (!state.fatigue) {
    state.fatigue = { peripheralFactor: DEFAULT_PERIPHERAL_FACTOR, week: 0, muscleMap: {}, tolerance: {} };
  }
  if (typeof state.fatigue.peripheralFactor !== 'number' || state.fatigue.peripheralFactor < 0) {
    state.fatigue.peripheralFactor = DEFAULT_PERIPHERAL_FACTOR;
  }
  if (typeof state.fatigue.week !== 'number' || state.fatigue.week < 0) {
    state.fatigue.week = 0;
  }
  if (!state.fatigue.muscleMap) {
    state.fatigue.muscleMap = {};
  }
  if (!state.fatigue.tolerance) {
    state.fatigue.tolerance = {};
  }

  for (const muscle of muscleGroups) {
    if (!state.fatigue.tolerance[muscle]) {
      state.fatigue.tolerance[muscle] = { ...defaultTolerance[muscle] };
    }
  }

  for (const ex of state.exercises) {
    if (state.fatigue.muscleMap[ex]) {
      continue;
    }

    state.fatigue.muscleMap[ex] = defaultMuscleMap[ex]
      ? JSON.parse(JSON.stringify(defaultMuscleMap[ex]))
      : { primary: [], secondary: [] };
  }
}

export function workingSetsForDay(day: ProgramDay | null | undefined): number {
  if (!day || day.isRest) {
    return 0;
  }

  let sets = Number(day.sets) || 0;
  for (const segment of [day.backoff, day.backoff2, day.backoff3]) {
    if (segment) {
      sets += Number(segment.sets) || 0;
    }
  }

  return sets;
}

export function weeklySetsForExercise(ex: string, weekIdx: number): number {
  const lift = state.lifts[ex];
  if (!lift) {
    return 0;
  }

  const program = programs[lift.program];
  if (!program || !program.length) {
    return 0;
  }

  const week = Math.min(Math.max(0, weekIdx), program.length - 1);
  return (program[week].days || []).reduce((sum, day) => sum + workingSetsForDay(day), 0);
}

export interface MuscleVolume {
  totals: Record<string, number>;
  contributors: Record<string, { ex: string; sets: number }[]>;
}

export function computeMuscleVolume(weekIdx: number): MuscleVolume {
  const peripheralFactor = state.fatigue.peripheralFactor;
  const totals: Record<string, number> = {};
  const contributors: Record<string, { ex: string; sets: number }[]> = {};

  const add = (muscle: string, ex: string, sets: number) => {
    totals[muscle] = (totals[muscle] || 0) + sets;

    if (!contributors[muscle]) {
      contributors[muscle] = [];
    }
    contributors[muscle].push({ ex, sets });
  };

  for (const ex of state.exercises) {
    const sets = weeklySetsForExercise(ex, weekIdx);
    if (sets <= 0) {
      continue;
    }

    const map = state.fatigue.muscleMap[ex] || { primary: [], secondary: [] };
    (map.primary || []).forEach((muscle) => add(muscle, ex, sets));
    (map.secondary || []).forEach((muscle) => add(muscle, ex, sets * peripheralFactor));
  }

  return { totals, contributors };
}

export function volumeZone(sets: number, mev: number, mrv: number): ZoneKey {
  if (sets <= 0) {
    return 'none';
  }
  if (mrv > 0 && sets > mrv) {
    return 'over';
  }
  if (sets < mev) {
    return 'under';
  }
  if (mrv > mev && sets >= mev + (mrv - mev) * NEAR_MRV_FRACTION) {
    return 'high';
  }

  return 'optimal';
}

export const zoneLabels: Record<ZoneKey, string> = {
  none: 'No volume', under: 'Below MEV', optimal: 'Optimal', high: 'Near MRV', over: 'Over MRV',
};

export function fmtSets(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
