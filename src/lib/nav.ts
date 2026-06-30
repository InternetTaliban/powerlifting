import type { NavKey, ViewId } from './types';

export interface NavItem {
  label: string;
  short: string;
  icon: string;
  view?: ViewId;
  essential?: boolean;
  isToday?: boolean;
}

export const NAV_ITEMS: Record<NavKey, NavItem> = {
  today: { label: "Today's Workout", short: 'Today', icon: 'icon-today', isToday: true },
  fatigue: { label: 'Fatigue Manager', short: 'Fatigue', icon: 'icon-activity', view: 'fatigueView' },
  schedule: { label: 'Master Schedule', short: 'Schedule', icon: 'icon-list', view: 'scheduleView' },
  planner: { label: 'Weekly Planner', short: 'Planner', icon: 'icon-calendar', view: 'calendarView' },
  settings: { label: 'Settings', short: 'Settings', icon: 'icon-settings', view: 'settingsView', essential: true },
  pobox: { label: 'PO Box', short: 'PO Box', icon: 'icon-inbox', view: 'poboxView' },
  rpe: { label: 'RPE & RIR Guide', short: 'RPE', icon: 'icon-info', view: 'rpeView' },
};

export const CONTROL_ITEMS: Record<string, { label: string }> = {
  max: { label: '1 Rep Max' },
  program: { label: 'Program Type' },
  variation: { label: 'Backoff Variation' },
  adjust: { label: 'Lift Adjustments' },
  warmup: { label: 'Warm-up' },
  loads: { label: 'Loads (Detailed / Rough)' },
};
