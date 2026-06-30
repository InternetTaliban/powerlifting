import { state } from './state';
import {
  muscleGroups, defaultTolerance, defaultMuscleMap,
  DEFAULT_PERIPHERAL_FACTOR, NEAR_MRV_FRACTION,
} from './data';
import { getProgram } from './programLookup';
import type { MuscleMapEntry, ProgramDay } from './types';

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
  if (!state.fatigue.variationMuscleMap) {
    state.fatigue.variationMuscleMap = {};
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

export function mainSetsForDay(day: ProgramDay | null | undefined): number {
  if (!day || day.isRest) {
    return 0;
  }

  return Number(day.sets) || 0;
}

export function backoffSetsForDay(day: ProgramDay | null | undefined): number {
  if (!day || day.isRest) {
    return 0;
  }

  let sets = 0;
  for (const segment of [day.backoff, day.backoff2, day.backoff3]) {
    if (segment) {
      sets += Number(segment.sets) || 0;
    }
  }

  return sets;
}

export function workingSetsForDay(day: ProgramDay | null | undefined): number {
  return mainSetsForDay(day) + backoffSetsForDay(day);
}

export interface SetSplit { main: number; backoff: number; }

export function weeklySplitForExercise(ex: string, weekIdx: number): SetSplit {
  const lift = state.lifts[ex];
  if (!lift) {
    return { main: 0, backoff: 0 };
  }

  const program = getProgram(lift.program);
  if (!program || !program.length) {
    return { main: 0, backoff: 0 };
  }

  const week = Math.min(Math.max(0, weekIdx), program.length - 1);
  let main = 0;
  let backoff = 0;
  for (const day of program[week].days || []) {
    main += mainSetsForDay(day);
    backoff += backoffSetsForDay(day);
  }

  return { main, backoff };
}

export function weeklySetsForExercise(ex: string, weekIdx: number): number {
  const split = weeklySplitForExercise(ex, weekIdx);
  return split.main + split.backoff;
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

  const addForMap = (map: MuscleMapEntry, ex: string, sets: number) => {
    (map.primary || []).forEach((muscle) => add(muscle, ex, sets));
    (map.secondary || []).forEach((muscle) => add(muscle, ex, sets * peripheralFactor));
  };

  for (const ex of state.exercises) {
    const { main, backoff } = weeklySplitForExercise(ex, weekIdx);
    if (main <= 0 && backoff <= 0) {
      continue;
    }

    const exMap = state.fatigue.muscleMap[ex] || { primary: [], secondary: [] };
    // Backoff sets follow the active variation's own muscle map when it has one;
    // otherwise everything counts toward the exercise's muscles (legacy behaviour).
    const variation = state.lifts[ex]?.variation;
    const varMap = (backoff > 0 && variation != null)
      ? state.fatigue.variationMuscleMap?.[ex]?.[variation]
      : undefined;

    if (varMap) {
      if (main > 0) {
        addForMap(exMap, ex, main);
      }
      addForMap(varMap, ex, backoff);
    } else {
      addForMap(exMap, ex, main + backoff);
    }
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
