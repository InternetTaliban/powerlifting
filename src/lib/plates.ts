import { state } from './state';
import { pullupPrograms } from './data';
import type { Unit } from './types';

export const BAR_WEIGHT: Record<Unit, number> = { kg: 20, lbs: 45 };

export const PLATE_DENOMS: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lbs: [45, 35, 25, 10, 5, 2.5],
};

export interface PlateColor { bg: string; fg: string; }

export const PLATE_COLORS: Record<Unit, Record<number, PlateColor>> = {
  kg: {
    25: { bg: '#d32f2f', fg: '#fff' },
    20: { bg: '#1565c0', fg: '#fff' },
    15: { bg: '#f9a825', fg: '#1a1a1a' },
    10: { bg: '#2e7d32', fg: '#fff' },
    5: { bg: '#e0e0e0', fg: '#1a1a1a' },
    2.5: { bg: '#424242', fg: '#fff' },
    1.25: { bg: '#9e9e9e', fg: '#1a1a1a' },
  },
  lbs: {
    45: { bg: '#1565c0', fg: '#fff' },
    35: { bg: '#f9a825', fg: '#1a1a1a' },
    25: { bg: '#2e7d32', fg: '#fff' },
    10: { bg: '#455a64', fg: '#fff' },
    5: { bg: '#b0bec5', fg: '#1a1a1a' },
    2.5: { bg: '#607d8b', fg: '#fff' },
  },
};

const PLATE_MAX_H = 88;
const PLATE_BASE_W = 16;

// Plate bar height as a fraction of the max, by denomination rank (largest first).
const PLATE_HEIGHT_RATIOS = [1, 1, 0.89, 0.72, 0.51, 0.42, 0.36];

const PLATE_EPSILON = 0.001;

export function plateHeight(denom: number, unit: Unit): number {
  const denoms = PLATE_DENOMS[unit] || PLATE_DENOMS.kg;
  const rank = denoms.indexOf(denom);
  const ratio = PLATE_HEIGHT_RATIOS[Math.min(Math.max(rank, 0), PLATE_HEIGHT_RATIOS.length - 1)];
  return Math.round(ratio * PLATE_MAX_H);
}

// Plate thickness scales by denomination: the 25 kg is the full base width and the
// rest a tuned fraction of it. Keyed by value, so lbs reuses the shared 10/5/2.5.
const PLATE_WIDTH_SCALE: Record<number, number> = { 20: 0.86, 15: 0.67, 10: 0.6, 5: 0.45, 2.5: 0.33, 1.25: 0.31 };

export function plateWidth(denom: number): number {
  return +(PLATE_BASE_W * (PLATE_WIDTH_SCALE[denom] ?? 1)).toFixed(2);
}

export interface PlateOpts { allow25?: boolean; }

export function effectiveDenoms(unit: Unit, opts: PlateOpts = {}): number[] {
  const denoms = PLATE_DENOMS[unit] || PLATE_DENOMS.kg;
  if (unit === 'kg' && opts.allow25 === false) {
    return denoms.filter((denom) => denom !== 25);
  }
  return denoms.slice();
}

export function isBarbellLift(lift: string): boolean {
  if (lift === 'pullup') {
    return false;
  }

  const prog = state.lifts[lift] && state.lifts[lift].program;
  return !pullupPrograms.includes(prog);
}

export interface PlatesResult {
  bar: number;
  plates: number[];
  achieved: number;
  remainder: number;
  loadable: boolean;
}

export function platesPerSide(total: number, unit: Unit, opts: PlateOpts = {}): PlatesResult {
  const denoms = effectiveDenoms(unit, opts);
  const bar = BAR_WEIGHT[unit] || BAR_WEIGHT.kg;
  const result: PlatesResult = { bar, plates: [], achieved: bar, remainder: 0, loadable: total >= bar };

  if (total <= bar) {
    result.remainder = Math.max(0, +(total - bar).toFixed(3));
    return result;
  }

  let side = (total - bar) / 2;
  for (const denom of denoms) {
    while (side + PLATE_EPSILON >= denom) {
      result.plates.push(denom);
      side -= denom;
    }
  }

  const perSide = result.plates.reduce((sum, plate) => sum + plate, 0);
  result.achieved = bar + 2 * perSide;
  result.remainder = Math.max(0, +(total - result.achieved).toFixed(3));
  return result;
}

export interface PlatesRounded {
  down: PlatesResult;
  up: PlatesResult;
  exact: boolean;
}

export function platesRounded(total: number, unit: Unit, opts: PlateOpts = {}): PlatesRounded {
  const down = platesPerSide(total, unit, opts);
  if (!down.loadable || down.remainder <= PLATE_EPSILON) {
    return { down, up: down, exact: true };
  }

  const denoms = effectiveDenoms(unit, opts);
  const step = 2 * denoms[denoms.length - 1];
  const up = platesPerSide(down.achieved + step, unit, opts);
  return { down, up, exact: false };
}

export function formatPlateNum(value: number): string {
  return String(+Number(value).toFixed(2));
}
