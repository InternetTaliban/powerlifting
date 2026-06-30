import type { ControlsConfig, NavConfig, NavLocation } from '../types';

export const NAV_KEYS = ['today', 'fatigue', 'schedule', 'planner', 'settings', 'pobox', 'rpe'];

const NAV_DEFAULT_ORDER = ['today', 'fatigue', 'schedule', 'rpe', 'planner', 'settings', 'pobox'];
const NAV_DEFAULT_LAYOUT: Record<string, NavLocation> = {
  today: 'top', pobox: 'top',
  schedule: 'bottom', rpe: 'bottom', planner: 'bottom', settings: 'bottom',
  fatigue: 'hidden',
};

export function defaultNavConfig(): NavConfig {
  const layout: Record<string, NavLocation> = {};
  NAV_KEYS.forEach((k) => {
    layout[k] = NAV_DEFAULT_LAYOUT[k] || 'hidden';
  });
  return {
    order: [...NAV_DEFAULT_ORDER], layout, revealControl: 'settings', showHidden: false,
    fabs: { today: true, scrollTop: true, goToTraining: true },
  };
}

export const CONTROL_KEYS = ['max', 'program', 'variation', 'adjust', 'warmup', 'loads'];
export const CONTROLS_HIDDEN_BY_DEFAULT = ['adjust', 'loads'];

export function defaultControlsConfig(): ControlsConfig {
  const layout: Record<string, 'show' | 'hidden'> = {};
  CONTROL_KEYS.forEach((k) => {
    layout[k] = CONTROLS_HIDDEN_BY_DEFAULT.includes(k) ? 'hidden' : 'show';
  });
  return { order: [...CONTROL_KEYS], layout };
}
