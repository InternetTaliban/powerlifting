import type { Unit, WarmupPref } from '../types';

export const ACCEPTING_IDEAS = false;

export const ROUNDING_STEP: Record<Unit, number> = { kg: 2.5, lbs: 5 };

export const DEFAULT_INCREMENT: Record<Unit, number> = { kg: 2.5, lbs: 5 };
export const PULLUP_INCREMENT: Record<Unit, number> = { kg: 1.25, lbs: 2.5 };

export const BLOCK_WEEKS = 4;
export const DAYS_PER_WEEK = 7;

export const DEFAULT_DIALOG_OFFSET = 65;
export const THUMB_REACH_DIALOG_OFFSET = 85;
export const DIALOG_OFFSET_MIN = 0;
export const DIALOG_OFFSET_MAX = 100;

export const NEW_EXERCISE_DEFAULT_MAX = 100;

export const roundingDict: Record<string, string> = { exact: 'Exact', down: 'Round Down', up: 'Round Up' };
export const roundingList = ['exact', 'down', 'up'] as const;

export const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const autoAssignMap: Record<string, number[]> = {
  squat: [0, 4], bench: [0, 2, 5], deadlift: [4, 1], ohp: [1, 2, 5], pullup: [0, 4],
};

export const DEFAULT_WARMUP: WarmupPref = { sets: 3, startPct: 0.4 };

export const WARMUP_SETS_MIN = 1;
export const WARMUP_SETS_MAX = 8;
export const WARMUP_START_PCT_MIN = 0.1;
export const WARMUP_START_PCT_MAX = 0.95;
