import { state } from './state';
import { programs, programsDict } from './data';
import type { Program } from './types';

// Resolve a program key against both the built-in catalog and the user's custom
// programs, so every consumer (table, calendar, plates, fatigue, …) works the same
// for either. Built-in style/progressable keep the legacy name-prefix rules; custom
// programs carry their own flags.

export function getProgram(key: string): Program | undefined {
  return programs[key] ?? state.customPrograms?.[key]?.weeks;
}

export function getProgramName(key: string): string {
  return programsDict[key] ?? state.customPrograms?.[key]?.name ?? key;
}

export function customProgramKeys(): string[] {
  return Object.keys(state.customPrograms || {});
}

export function programStyle(key: string): 'build' | 'peak' {
  const custom = state.customPrograms?.[key];
  if (custom) {
    return custom.style;
  }

  return (key.startsWith('building') || key === 'rpe_3day' || key === 'rpe_2day' || key === 'pullup_double')
    ? 'build' : 'peak';
}

export function programProgressable(key: string): boolean {
  const custom = state.customPrograms?.[key];
  if (custom) {
    return custom.progressable;
  }

  return key.startsWith('building') || key === 'rpe_3day' || key === 'rpe_2day'
    || key === 'pullup_double' || key === 'pullup_fighter';
}

export function programHasBackoff(key: string): boolean {
  const program = getProgram(key);
  if (!program) {
    return false;
  }

  return program.some((week) => (week.days || []).some((day) => !!day.backoff));
}
