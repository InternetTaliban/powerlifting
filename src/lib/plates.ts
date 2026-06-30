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
const PLATE_MIN_H = 36;

const PLATE_EPSILON = 0.001;

export function plateHeight(denom: number, unit: Unit): number {
  const denoms = PLATE_DENOMS[unit] || PLATE_DENOMS.kg;
  const max = denoms[0];
  const min = denoms[denoms.length - 1];
  if (max === min) {
    return PLATE_MAX_H;
  }

  const ratio = (denom - min) / (max - min);
  return Math.round(PLATE_MIN_H + ratio * (PLATE_MAX_H - PLATE_MIN_H));
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
