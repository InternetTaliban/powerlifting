import { state } from './state';
import { DEFAULT_WARMUP } from './data';
import type { WarmupPref } from './types';

export function ensureWarmupState(): void {
  if (!state.warmup || typeof state.warmup !== 'object') {
    state.warmup = {};
  }

  for (const ex of state.exercises) {
    const pref = state.warmup[ex];
    if (!pref || typeof pref !== 'object') {
      state.warmup[ex] = { ...DEFAULT_WARMUP };
    }
  }
}

export function warmupPrefs(lift: string): WarmupPref {
  const pref = (state.warmup && state.warmup[lift]) || DEFAULT_WARMUP;
  return { sets: pref.sets, startPct: pref.startPct };
}
