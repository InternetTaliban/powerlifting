import { state } from './state';
import { ROUNDING_STEP, WARMUP_START_PCT_MIN, WARMUP_START_PCT_MAX } from './data';
import { getProgram } from './programLookup';
import { BAR_WEIGHT } from './plates';
import type { Lift, Unit } from './types';

export function blockSuffix(block: number): string {
  return block > 0 ? `-b${block}` : '';
}

export function makeRowId(lift: string, program: string, week: number, day: number, block?: number): string {
  return `${lift}-${program}-w${week}-d${day}${blockSuffix(block || 0)}`;
}

export function rowIdBlock(rowId: string): number {
  const match = /-b(\d+)$/.exec(rowId || '');
  return match ? parseInt(match[1], 10) : 0;
}

export function resolveRowMax(lift: string, rowId: string, override?: number | string | null): number {
  if (override != null && override !== '' && !isNaN(Number(override))) {
    return Number(override);
  }
  if (state.loggedMax && state.loggedMax[rowId] != null) {
    return state.loggedMax[rowId];
  }
  return (state.lifts[lift] || ({} as Lift)).max;
}

export function getRepModifier(reps?: number | string, lift?: string): number {
  if (typeof reps !== 'number') {
    return 0;
  }

  const modifiers = (state.lifts[lift || state.activeLift] || ({} as Lift)).repModifiers;
  if (!modifiers) {
    return 0;
  }

  const points = reps === 1 ? modifiers.singles : reps <= 3 ? modifiers.triples : modifiers.volume;
  return (points || 0) / 100;
}

export function calculateWeight(max: number, pct: number, reps?: number | string, lift?: string): string {
  const adjusted = Math.max(0.01, pct + (reps !== undefined ? getRepModifier(reps, lift) : 0));
  const raw = max * adjusted;
  const step = state.global.unit === 'kg' ? ROUNDING_STEP.kg : ROUNDING_STEP.lbs;
  const epsilon = 0.0001;

  if (state.global.rounding === 'down') {
    return (Math.floor((raw + epsilon) / step) * step).toFixed(1);
  }
  if (state.global.rounding === 'up') {
    return (Math.ceil((raw - epsilon) / step) * step).toFixed(1);
  }

  return raw.toFixed(2);
}

export function roughWeight(max: number, pct: number, reps?: number | string, lift?: string): string {
  const adjusted = Math.max(0.01, pct + (reps !== undefined ? getRepModifier(reps, lift) : 0));
  return Math.round(max * adjusted).toString();
}

// "Gym math" 1RM conversion: instead of the 2.2046 factor, treat each kg plate as its
// similarly-sized lb plate (20 kg <-> 45 lb, ...) so the loaded bar looks the same after a
// unit switch. Non-whole-plate loads round down, so the conversion is lossy by design.
const GYM_PLATE_PAIRS: { kg: number; lbs: number }[] = [
  { kg: 20, lbs: 45 },
  { kg: 15, lbs: 35 },
  { kg: 10, lbs: 25 },
  { kg: 5, lbs: 10 },
  { kg: 2.5, lbs: 5 },
  { kg: 1.25, lbs: 2.5 },
];

const GYM_MATH_EPSILON = 0.01;

export function convertMaxGymMath(weight: number, fromUnit: Unit): number {
  const toUnit: Unit = fromUnit === 'kg' ? 'lbs' : 'kg';
  let sidePlates = (weight - BAR_WEIGHT[fromUnit]) / 2;
  if (sidePlates < 0) {
    return BAR_WEIGHT[toUnit];
  }

  let convertedSide = 0;
  for (const pair of GYM_PLATE_PAIRS) {
    const count = Math.floor((sidePlates + GYM_MATH_EPSILON) / pair[fromUnit]);
    convertedSide += count * pair[toUnit];
    sidePlates -= count * pair[fromUnit];
  }

  return BAR_WEIGHT[toUnit] + 2 * convertedSide;
}

export function topWorkingPct(lift: string): number {
  const liftData = state.lifts[lift];
  if (!liftData) {
    return 0;
  }

  const program = getProgram(liftData.program);
  if (!program) {
    return 0;
  }

  let topPct = 0;
  for (const week of program) {
    for (const day of week.days || []) {
      if (!day || day.isRest) {
        continue;
      }

      for (const slot of [day.pct, day.backoff, day.backoff2, day.backoff3]) {
        const pct = typeof slot === 'number' ? slot : (slot && slot.pct);
        if (typeof pct === 'number' && pct > topPct) {
          topPct = pct;
        }
      }
    }
  }

  return topPct;
}

const WARMUP_REP_STEPS: { below: number; reps: number }[] = [
  { below: 0.55, reps: 5 },
  { below: 0.75, reps: 3 },
  { below: 0.88, reps: 2 },
];
const WARMUP_TOP_REPS = 1;

export function warmupReps(fraction: number): number {
  for (const step of WARMUP_REP_STEPS) {
    if (fraction < step.below) {
      return step.reps;
    }
  }
  return WARMUP_TOP_REPS;
}

export interface WarmupStep {
  pct: number;
  weight: number;
  reps: number;
}

export function generateWarmups(workingWeight: number, sets: number | string, startPct: number): WarmupStep[] {
  sets = Math.floor(Number(sets) || 0);
  if (!(workingWeight > 0) || sets <= 0) {
    return [];
  }

  startPct = Math.min(
    WARMUP_START_PCT_MAX,
    Math.max(WARMUP_START_PCT_MIN, Number(startPct) || WARMUP_START_PCT_MIN),
  );

  const steps: WarmupStep[] = [];
  for (let i = 0; i < sets; i++) {
    const fraction = startPct + (1 - startPct) * (i / sets);
    steps.push({
      pct: fraction,
      weight: parseFloat(calculateWeight(workingWeight, fraction)),
      reps: warmupReps(fraction),
    });
  }

  return steps;
}
