import {
  defaultState, NAV_KEYS, CONTROL_KEYS, defaultControlsConfig, defaultNavConfig,
  muscleGroups, defaultTolerance, defaultMuscleMap, DEFAULT_PERIPHERAL_FACTOR, DEFAULT_WARMUP,
  pullupPrograms, regularPrograms, roundingList,
  DEFAULT_INCREMENT, PULLUP_INCREMENT, NEW_EXERCISE_DEFAULT_MAX,
  DEFAULT_DIALOG_OFFSET, DIALOG_OFFSET_MIN, DIALOG_OFFSET_MAX,
  WARMUP_SETS_MIN, WARMUP_SETS_MAX, WARMUP_START_PCT_MIN, WARMUP_START_PCT_MAX,
} from './data';
import type { Lift, NavConfig, NavLocation, NormalizeReport, State } from './types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export let state: State = clone(defaultState);

export function getState(): State {
  return state;
}

export function setState(next: State): void {
  state = next;
}

const absent = (value: unknown): boolean => value === undefined || value === null;

type FixResult = 'ok' | 'filled' | 'recovered' | 'default';

function liftLabel(lift: string): string {
  return lift.charAt(0).toUpperCase() + lift.slice(1);
}

// Coerce a scalar field to a valid enum value. Absent → default (filled). A
// trimmed/lower-cased near-match is salvaged (recovered); anything else resets.
function coerceEnum(obj: any, key: string, valid: readonly string[], fallback: string): FixResult {
  const raw = obj[key];
  if (absent(raw)) {
    obj[key] = fallback;
    return 'filled';
  }
  if (valid.includes(raw)) {
    return 'ok';
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim().toLowerCase();
    if (valid.includes(trimmed)) {
      obj[key] = trimmed;
      return 'recovered';
    }
  }

  obj[key] = fallback;
  return 'default';
}

// Coerce a numeric field within [min, max]. Absent → default (filled). A numeric
// string is parsed (recovered); out-of-range / non-numeric resets to default.
function coerceNumber(obj: any, key: string, min: number, max: number, fallback: number): FixResult {
  const raw = obj[key];
  if (absent(raw)) {
    obj[key] = fallback;
    return 'filled';
  }

  let value = raw;
  let fromString = false;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) {
      value = parsed;
      fromString = true;
    }
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    obj[key] = fallback;
    return 'default';
  }
  if (fromString) {
    obj[key] = value;
    return 'recovered';
  }
  return 'ok';
}

function coerceBool(obj: any, key: string, fallback: boolean): FixResult {
  const raw = obj[key];
  if (absent(raw)) {
    obj[key] = fallback;
    return 'filled';
  }
  if (typeof raw === 'boolean') {
    return 'ok';
  }

  if (raw === 'true') {
    obj[key] = true;
    return 'recovered';
  }
  if (raw === 'false') {
    obj[key] = false;
    return 'recovered';
  }

  obj[key] = fallback;
  return 'default';
}

function seedNav(navPosition: unknown): NavConfig {
  const wasBottom = navPosition === 'bottom';
  const layout: Record<string, NavLocation> = {};

  for (const key of NAV_KEYS) {
    if (key === 'rpe') {
      layout[key] = 'hidden';
    } else if (wasBottom && key !== 'today' && key !== 'pobox') {
      layout[key] = 'bottom';
    } else {
      layout[key] = 'top';
    }
  }

  return {
    order: [...NAV_KEYS],
    layout,
    revealControl: 'settings',
    showHidden: false,
    fabs: { today: false, scrollTop: true, goToTraining: true },
  };
}

// The untrusted-input boundary: takes arbitrary parsed JSON (stored or imported)
// and mutates it into a valid State, returning whether anything changed. When a
// `report` is supplied it also records what it touched: absent fields that took a
// default (`filled`, silent) vs present-but-invalid fields (`issues`, surfaced on
// Import). Typed `any` on purpose — see TECHNICAL.md.
export function normalizeState(draft: any, report?: NormalizeReport): boolean {
  let dirty = false;

  const fill = (label: string): void => {
    if (report) {
      report.filled.push(label);
    }
  };
  const bad = (label: string, resolution: 'recovered' | 'default' = 'default'): void => {
    if (report) {
      report.issues.push({ setting: label, resolution });
    }
  };
  const applyFix = (label: string, result: FixResult): void => {
    if (result === 'ok') {
      return;
    }
    if (result === 'filled') {
      fill(label);
    } else {
      bad(label, result);
    }
    dirty = true;
  };

  let calendarDropped = 0;
  let loggedDropped = 0;
  let loggedMaxDropped = 0;
  let customWorkoutsDropped = 0;
  let customProgramsDropped = 0;

  if (absent(draft.global)) {
    draft.global = JSON.parse(JSON.stringify(defaultState.global));
    fill('Global settings');
    dirty = true;
  } else if (typeof draft.global !== 'object') {
    draft.global = JSON.parse(JSON.stringify(defaultState.global));
    bad('Global settings');
    dirty = true;
  }

  if (draft.calendar && typeof draft.calendar === 'object') {
    for (const key of Object.keys(draft.calendar)) {
      if (draft.calendar[key] !== 'hidden' && !/^\d{4}-\d{2}-\d{2}$/.test(draft.calendar[key])) {
        delete draft.calendar[key];
        calendarDropped++;
        dirty = true;
      }
    }
  }

  if (absent(draft.exercises)) {
    draft.exercises = ['squat', 'bench', 'deadlift', 'ohp'];
    fill('Exercises');
    dirty = true;
  } else if (!Array.isArray(draft.exercises)) {
    draft.exercises = ['squat', 'bench', 'deadlift', 'ohp'];
    bad('Exercises');
    dirty = true;
  } else {
    const valid = draft.exercises.filter((item: unknown) => typeof item === 'string' && item);
    if (valid.length === 0) {
      draft.exercises = ['squat', 'bench', 'deadlift', 'ohp'];
      bad('Exercises');
      dirty = true;
    } else if (valid.length !== draft.exercises.length) {
      draft.exercises = valid;
      bad('Exercises', 'recovered');
      dirty = true;
    }
  }

  if (absent(draft.variationsDict)) {
    draft.variationsDict = JSON.parse(JSON.stringify(defaultState.variationsDict));
    fill('Variations');
    dirty = true;
  } else if (typeof draft.variationsDict !== 'object') {
    draft.variationsDict = JSON.parse(JSON.stringify(defaultState.variationsDict));
    bad('Variations');
    dirty = true;
  }

  if (absent(draft.allowedPrograms)) {
    draft.allowedPrograms = JSON.parse(JSON.stringify(defaultState.allowedPrograms));
    fill('Allowed programs');
    dirty = true;
  } else if (typeof draft.allowedPrograms !== 'object') {
    draft.allowedPrograms = JSON.parse(JSON.stringify(defaultState.allowedPrograms));
    bad('Allowed programs');
    dirty = true;
  }

  if (absent(draft.customPrograms)) {
    draft.customPrograms = {};
    fill('Custom programs');
    dirty = true;
  } else if (typeof draft.customPrograms !== 'object') {
    draft.customPrograms = {};
    bad('Custom programs');
    dirty = true;
  }

  for (const key of Object.keys(draft.customPrograms)) {
    const cp = draft.customPrograms[key];
    const hasWeek = cp && typeof cp === 'object' && Array.isArray(cp.weeks)
      && cp.weeks.some((w: any) => w && typeof w === 'object' && Array.isArray(w.days) && w.days.length > 0);
    if (!hasWeek || typeof cp.name !== 'string' || cp.name.trim() === '') {
      delete draft.customPrograms[key];
      customProgramsDropped++;
      dirty = true;
      continue;
    }

    cp.weeks = cp.weeks.filter((w: any) => w && typeof w === 'object' && Array.isArray(w.days) && w.days.length > 0);
    if (cp.style !== 'build' && cp.style !== 'peak') {
      cp.style = 'build';
      dirty = true;
    }
    if (typeof cp.progressable !== 'boolean') {
      cp.progressable = cp.style === 'build';
      dirty = true;
    }
  }

  if (absent(draft.lifts)) {
    draft.lifts = JSON.parse(JSON.stringify(defaultState.lifts));
    fill('Lifts');
    dirty = true;
  } else if (typeof draft.lifts !== 'object') {
    draft.lifts = JSON.parse(JSON.stringify(defaultState.lifts));
    bad('Lifts');
    dirty = true;
  }

  if (absent(draft.completed)) {
    draft.completed = {};
    fill('Completed workouts');
    dirty = true;
  } else if (typeof draft.completed !== 'object') {
    draft.completed = {};
    bad('Completed workouts');
    dirty = true;
  }

  if (absent(draft.calendar)) {
    draft.calendar = {};
    fill('Calendar');
    dirty = true;
  } else if (typeof draft.calendar !== 'object') {
    draft.calendar = {};
    bad('Calendar');
    dirty = true;
  }

  if (absent(draft.logged)) {
    draft.logged = {};
    fill('Logged weights');
    dirty = true;
  } else if (typeof draft.logged !== 'object') {
    draft.logged = {};
    bad('Logged weights');
    dirty = true;
  }

  if (absent(draft.loggedMax)) {
    draft.loggedMax = {};
    fill('Pinned 1RMs');
    dirty = true;
  } else if (typeof draft.loggedMax !== 'object') {
    draft.loggedMax = {};
    bad('Pinned 1RMs');
    dirty = true;
  }

  // Defence in depth: the UI only ever writes numbers here, but a hand-edited or
  // malicious import could smuggle a markup string — coerce, keeping finite numbers.
  for (const rowId of Object.keys(draft.logged)) {
    const entry = draft.logged[rowId];
    if (!entry || typeof entry !== 'object') {
      delete draft.logged[rowId];
      loggedDropped++;
      dirty = true;
      continue;
    }

    for (const key of Object.keys(entry)) {
      if (typeof entry[key] !== 'number' || !isFinite(entry[key])) {
        delete entry[key];
        loggedDropped++;
        dirty = true;
      }
    }

    if (Object.keys(entry).length === 0) {
      delete draft.logged[rowId];
      dirty = true;
    }
  }

  for (const rowId of Object.keys(draft.loggedMax)) {
    if (typeof draft.loggedMax[rowId] !== 'number' || !isFinite(draft.loggedMax[rowId])) {
      delete draft.loggedMax[rowId];
      loggedMaxDropped++;
      dirty = true;
    }
  }

  if (absent(draft.customWorkouts)) {
    draft.customWorkouts = {};
    fill('Custom workouts');
    dirty = true;
  } else if (typeof draft.customWorkouts !== 'object') {
    draft.customWorkouts = {};
    bad('Custom workouts');
    dirty = true;
  }

  for (const id of Object.keys(draft.customWorkouts)) {
    const definition = draft.customWorkouts[id];
    if (!definition || typeof definition.name !== 'string' || definition.name.trim() === '') {
      delete draft.customWorkouts[id];
      customWorkoutsDropped++;
      dirty = true;
      continue;
    }

    if (typeof definition.note !== 'string') {
      definition.note = '';
      dirty = true;
    }
  }

  for (const key of Object.keys(draft.calendar)) {
    if (key.startsWith('cw-') && !draft.customWorkouts[key]) {
      delete draft.calendar[key];
      dirty = true;
    }
  }
  for (const key of Object.keys(draft.completed)) {
    if (key.startsWith('cw-') && !draft.customWorkouts[key]) {
      delete draft.completed[key];
      dirty = true;
    }
  }

  if (absent(draft.global.calendarWeek)) {
    draft.global.calendarWeek = 0;
    fill('Calendar week');
    dirty = true;
  } else if (typeof draft.global.calendarWeek !== 'number' || !Number.isFinite(draft.global.calendarWeek)) {
    draft.global.calendarWeek = 0;
    bad('Calendar week');
    dirty = true;
  }

  applyFix('Rounding', coerceEnum(draft.global, 'rounding', roundingList, 'exact'));
  applyFix('Units', coerceEnum(draft.global, 'unit', ['kg', 'lbs'], 'kg'));
  applyFix('Navigation position', coerceEnum(draft.global, 'navPosition', ['top', 'bottom'], 'top'));
  applyFix(
    'Back button position',
    coerceEnum(draft.global, 'backPosition', ['top', 'bottom'], draft.global.navPosition === 'bottom' ? 'bottom' : 'top'),
  );
  applyFix('Always show back button', coerceBool(draft.global, 'alwaysShowBack', false));
  applyFix(
    'Prompt position',
    coerceNumber(draft.global, 'dialogOffset', DIALOG_OFFSET_MIN, DIALOG_OFFSET_MAX, DEFAULT_DIALOG_OFFSET),
  );
  applyFix('Allow 25 kg plates', coerceBool(draft.global, 'allow25kgPlates', true));
  applyFix('Rough loads', coerceBool(draft.global, 'roughLoads', false));
  applyFix('Loads toggle', coerceBool(draft.global, 'showLoadsToggle', false));

  let navSeeded = false;
  let navChanged = false;
  if (absent(draft.global.nav)) {
    draft.global.nav = seedNav(draft.global.navPosition);
    fill('Navigation layout');
    navSeeded = true;
    dirty = true;
  } else if (typeof draft.global.nav !== 'object') {
    draft.global.nav = seedNav(draft.global.navPosition);
    bad('Navigation layout');
    navSeeded = true;
    dirty = true;
  }

  const nav = draft.global.nav;
  if (!Array.isArray(nav.order)) {
    nav.order = [];
    navChanged = true;
  }

  const cleanedOrder = nav.order.filter((key: string, i: number) => NAV_KEYS.includes(key) && nav.order.indexOf(key) === i);
  for (const key of NAV_KEYS) {
    if (!cleanedOrder.includes(key)) {
      cleanedOrder.push(key);
    }
  }
  if (cleanedOrder.length !== nav.order.length || cleanedOrder.some((key: string, i: number) => key !== nav.order[i])) {
    nav.order = cleanedOrder;
    navChanged = true;
  }

  if (!nav.layout || typeof nav.layout !== 'object') {
    nav.layout = {};
    navChanged = true;
  }
  for (const key of NAV_KEYS) {
    const value = nav.layout[key];
    if (value !== 'top' && value !== 'bottom' && value !== 'hidden') {
      nav.layout[key] = key === 'rpe' ? 'hidden' : 'top';
      navChanged = true;
    }
  }
  for (const key of Object.keys(nav.layout)) {
    if (!NAV_KEYS.includes(key)) {
      delete nav.layout[key];
      navChanged = true;
    }
  }

  if (nav.layout.settings === 'hidden') {
    nav.layout.settings = 'top';
    navChanged = true;
  }
  if (nav.revealControl !== 'settings' && nav.revealControl !== 'menu') {
    nav.revealControl = 'settings';
    navChanged = true;
  }
  if (typeof nav.showHidden !== 'boolean') {
    nav.showHidden = false;
    navChanged = true;
  }

  if (!nav.fabs || typeof nav.fabs !== 'object') {
    nav.fabs = { today: false, scrollTop: true, goToTraining: true };
    navChanged = true;
  }
  if (typeof nav.fabs.today !== 'boolean') {
    nav.fabs.today = false;
    navChanged = true;
  }
  if (typeof nav.fabs.scrollTop !== 'boolean') {
    nav.fabs.scrollTop = true;
    navChanged = true;
  }
  if (typeof nav.fabs.goToTraining !== 'boolean') {
    nav.fabs.goToTraining = true;
    navChanged = true;
  }

  if (navChanged) {
    dirty = true;
    if (!navSeeded) {
      bad('Navigation layout', 'recovered');
    }
  }

  let ctrlSeeded = false;
  let ctrlChanged = false;
  if (absent(draft.global.controls)) {
    draft.global.controls = defaultControlsConfig();
    draft.global.controls.layout.loads = draft.global.showLoadsToggle ? 'show' : 'hidden';
    fill('Lift controls');
    ctrlSeeded = true;
    dirty = true;
  } else if (typeof draft.global.controls !== 'object') {
    draft.global.controls = defaultControlsConfig();
    draft.global.controls.layout.loads = draft.global.showLoadsToggle ? 'show' : 'hidden';
    bad('Lift controls');
    ctrlSeeded = true;
    dirty = true;
  }

  const ctrl = draft.global.controls;
  if (!Array.isArray(ctrl.order)) {
    ctrl.order = [];
    ctrlChanged = true;
  }

  const cleanedControls = ctrl.order.filter(
    (key: string, i: number) => CONTROL_KEYS.includes(key) && ctrl.order.indexOf(key) === i,
  );
  for (const key of CONTROL_KEYS) {
    if (!cleanedControls.includes(key)) {
      cleanedControls.push(key);
    }
  }
  if (
    cleanedControls.length !== ctrl.order.length
    || cleanedControls.some((key: string, i: number) => key !== ctrl.order[i])
  ) {
    ctrl.order = cleanedControls;
    ctrlChanged = true;
  }

  if (!ctrl.layout || typeof ctrl.layout !== 'object') {
    ctrl.layout = {};
    ctrlChanged = true;
  }
  for (const key of CONTROL_KEYS) {
    if (ctrl.layout[key] !== 'show' && ctrl.layout[key] !== 'hidden') {
      ctrl.layout[key] = key === 'loads' ? 'hidden' : 'show';
      ctrlChanged = true;
    }
  }
  for (const key of Object.keys(ctrl.layout)) {
    if (!CONTROL_KEYS.includes(key)) {
      delete ctrl.layout[key];
      ctrlChanged = true;
    }
  }

  if (ctrlChanged) {
    dirty = true;
    if (!ctrlSeeded) {
      bad('Lift controls', 'recovered');
    }
  }

  if (absent(draft.allowedVariations)) {
    draft.allowedVariations = {};
    for (const ex of draft.exercises) {
      draft.allowedVariations[ex] = (draft.variationsDict[ex] || []).map((_: unknown, i: number) => i);
    }
    fill('Allowed variations');
    dirty = true;
  } else if (typeof draft.allowedVariations !== 'object') {
    draft.allowedVariations = {};
    for (const ex of draft.exercises) {
      draft.allowedVariations[ex] = (draft.variationsDict[ex] || []).map((_: unknown, i: number) => i);
    }
    bad('Allowed variations');
    dirty = true;
  }

  if (absent(draft.increments)) {
    draft.increments = {};
    for (const ex of draft.exercises) {
      draft.increments[ex] = draft.global.unit === 'kg' ? DEFAULT_INCREMENT.kg : DEFAULT_INCREMENT.lbs;
    }
    fill('Increments');
    dirty = true;
  } else if (typeof draft.increments !== 'object') {
    draft.increments = {};
    for (const ex of draft.exercises) {
      draft.increments[ex] = draft.global.unit === 'kg' ? DEFAULT_INCREMENT.kg : DEFAULT_INCREMENT.lbs;
    }
    bad('Increments');
    dirty = true;
  }

  // Every listed exercise needs a lift record; a relaxed import may omit one.
  for (const ex of draft.exercises) {
    if (absent(draft.lifts[ex])) {
      const defaultLift = (defaultState.lifts as Record<string, Lift>)[ex];
      draft.lifts[ex] = defaultLift
        ? JSON.parse(JSON.stringify(defaultLift))
        : { max: NEW_EXERCISE_DEFAULT_MAX, program: regularPrograms[0], variation: 0, block: 0 };
      fill(`${liftLabel(ex)} → lift`);
      dirty = true;
    }
  }

  for (const lift of Object.keys(draft.lifts)) {
    const label = liftLabel(lift);
    const entry = draft.lifts[lift];

    if (absent(draft.variationsDict[lift])) {
      draft.variationsDict[lift] = ['Main ' + lift];
      fill(`${label} → variations`);
      dirty = true;
    } else if (!Array.isArray(draft.variationsDict[lift])) {
      draft.variationsDict[lift] = ['Main ' + lift];
      bad(`${label} → variations`);
      dirty = true;
    }
    const variationCount = draft.variationsDict[lift].length;

    const defaultMax = (defaultState.lifts as Record<string, Lift>)[lift]?.max ?? NEW_EXERCISE_DEFAULT_MAX;
    if (absent(entry.max)) {
      entry.max = defaultMax;
      fill(`${label} → 1RM`);
      dirty = true;
    } else if (typeof entry.max !== 'number' || !Number.isFinite(entry.max) || entry.max <= 0) {
      const coerced = typeof entry.max === 'string' ? parseFloat(entry.max) : NaN;
      if (Number.isFinite(coerced) && coerced > 0) {
        entry.max = coerced;
        bad(`${label} → 1RM`, 'recovered');
      } else {
        entry.max = defaultMax;
        bad(`${label} → 1RM`);
      }
      dirty = true;
    }

    if (absent(entry.variation)) {
      entry.variation = 0;
      fill(`${label} → variation`);
      dirty = true;
    } else if (typeof entry.variation !== 'number' || !Number.isInteger(entry.variation)
      || entry.variation < 0 || entry.variation >= variationCount) {
      entry.variation = 0;
      bad(`${label} → variation`);
      dirty = true;
    }

    if (absent(entry.block)) {
      entry.block = 0;
      fill(`${label} → block`);
      dirty = true;
    } else if (typeof entry.block !== 'number' || entry.block < 0 || !Number.isInteger(entry.block)) {
      entry.block = 0;
      bad(`${label} → block`);
      dirty = true;
    }

    if (absent(draft.allowedVariations[lift])) {
      draft.allowedVariations[lift] = draft.variationsDict[lift].map((_: unknown, i: number) => i);
      fill(`${label} → allowed variations`);
      dirty = true;
    } else if (!Array.isArray(draft.allowedVariations[lift])) {
      draft.allowedVariations[lift] = draft.variationsDict[lift].map((_: unknown, i: number) => i);
      bad(`${label} → allowed variations`);
      dirty = true;
    } else {
      const validIdx = draft.allowedVariations[lift].filter(
        (i: unknown) => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < variationCount,
      );
      if (validIdx.length !== draft.allowedVariations[lift].length) {
        draft.allowedVariations[lift] = validIdx.length > 0
          ? validIdx
          : draft.variationsDict[lift].map((_: unknown, i: number) => i);
        bad(`${label} → allowed variations`, validIdx.length > 0 ? 'recovered' : 'default');
        dirty = true;
      }
    }

    if (absent(draft.increments[lift])) {
      draft.increments[lift] = draft.global.unit === 'kg' ? DEFAULT_INCREMENT.kg : DEFAULT_INCREMENT.lbs;
      fill(`${label} → increment`);
      dirty = true;
    } else if (
      typeof draft.increments[lift] !== 'number'
      || !Number.isFinite(draft.increments[lift])
      || draft.increments[lift] <= 0
    ) {
      const coerced = typeof draft.increments[lift] === 'string' ? parseFloat(draft.increments[lift]) : NaN;
      if (Number.isFinite(coerced) && coerced > 0) {
        draft.increments[lift] = coerced;
        bad(`${label} → increment`, 'recovered');
      } else {
        draft.increments[lift] = draft.global.unit === 'kg' ? DEFAULT_INCREMENT.kg : DEFAULT_INCREMENT.lbs;
        bad(`${label} → increment`);
      }
      dirty = true;
    }

    const customKeys = Object.keys(draft.customPrograms || {});
    const validPool = lift === 'pullup' ? [...pullupPrograms, ...customKeys] : [...regularPrograms, ...customKeys];
    if (absent(draft.allowedPrograms[lift])) {
      draft.allowedPrograms[lift] = [...validPool];
      fill(`${label} → allowed programs`);
      dirty = true;
    } else if (!Array.isArray(draft.allowedPrograms[lift])) {
      draft.allowedPrograms[lift] = [...validPool];
      bad(`${label} → allowed programs`);
      dirty = true;
    } else {
      const filtered = draft.allowedPrograms[lift].filter((prog: string) => validPool.includes(prog));
      if (filtered.length !== draft.allowedPrograms[lift].length) {
        draft.allowedPrograms[lift] = filtered.length > 0 ? filtered : [...validPool];
        bad(`${label} → allowed programs`, filtered.length > 0 ? 'recovered' : 'default');
        dirty = true;
      }
    }

    if (absent(entry.program)) {
      entry.program = draft.allowedPrograms[lift][0];
      fill(`${label} → program`);
      dirty = true;
    } else if (typeof entry.program !== 'string' || !entry.program) {
      entry.program = draft.allowedPrograms[lift][0];
      bad(`${label} → program`);
      dirty = true;
    } else if (!draft.allowedPrograms[lift].includes(entry.program)) {
      const oldProgram = entry.program;
      entry.program = draft.allowedPrograms[lift][0];
      bad(`${label} → program`);
      dirty = true;

      for (const key of Object.keys(draft.calendar)) {
        if (key.startsWith(`${lift}-${oldProgram}-`)) {
          delete draft.calendar[key];
        }
      }
    }
  }

  if (absent(draft.activeLift)) {
    draft.activeLift = draft.exercises[0] || '';
    fill('Active lift');
    dirty = true;
  } else if (!draft.exercises.includes(draft.activeLift)) {
    draft.activeLift = draft.exercises[0] || '';
    bad('Active lift');
    dirty = true;
  }

  if (absent(draft.fatigue)) {
    draft.fatigue = { peripheralFactor: DEFAULT_PERIPHERAL_FACTOR, week: 0, muscleMap: {}, tolerance: {} };
    fill('Fatigue settings');
    dirty = true;
  } else if (typeof draft.fatigue !== 'object') {
    draft.fatigue = { peripheralFactor: DEFAULT_PERIPHERAL_FACTOR, week: 0, muscleMap: {}, tolerance: {} };
    bad('Fatigue settings');
    dirty = true;
  }

  if (absent(draft.fatigue.peripheralFactor)) {
    draft.fatigue.peripheralFactor = DEFAULT_PERIPHERAL_FACTOR;
    fill('Fatigue → peripheral factor');
    dirty = true;
  } else if (typeof draft.fatigue.peripheralFactor !== 'number' || draft.fatigue.peripheralFactor < 0) {
    draft.fatigue.peripheralFactor = DEFAULT_PERIPHERAL_FACTOR;
    bad('Fatigue → peripheral factor');
    dirty = true;
  }

  if (absent(draft.fatigue.week)) {
    draft.fatigue.week = 0;
    fill('Fatigue → week');
    dirty = true;
  } else if (typeof draft.fatigue.week !== 'number' || draft.fatigue.week < 0) {
    draft.fatigue.week = 0;
    bad('Fatigue → week');
    dirty = true;
  }

  if (absent(draft.fatigue.muscleMap) || typeof draft.fatigue.muscleMap !== 'object') {
    draft.fatigue.muscleMap = {};
    fill('Fatigue → muscle map');
    dirty = true;
  }
  if (absent(draft.fatigue.tolerance) || typeof draft.fatigue.tolerance !== 'object') {
    draft.fatigue.tolerance = {};
    fill('Fatigue → volume landmarks');
    dirty = true;
  }

  for (const muscle of muscleGroups) {
    if (!draft.fatigue.tolerance[muscle]) {
      draft.fatigue.tolerance[muscle] = { ...defaultTolerance[muscle] };
      dirty = true;
    }
  }

  for (const ex of draft.exercises) {
    const entry = draft.fatigue.muscleMap[ex];
    if (!entry) {
      draft.fatigue.muscleMap[ex] = defaultMuscleMap[ex]
        ? JSON.parse(JSON.stringify(defaultMuscleMap[ex]))
        : { primary: [], secondary: [] };
      dirty = true;
      continue;
    }

    if (!Array.isArray(entry.primary)) {
      entry.primary = [];
      dirty = true;
    }
    if (!Array.isArray(entry.secondary)) {
      entry.secondary = [];
      dirty = true;
    }
  }

  if (draft.fatigue.variationMuscleMap && typeof draft.fatigue.variationMuscleMap === 'object') {
    for (const ex of Object.keys(draft.fatigue.variationMuscleMap)) {
      const perEx = draft.fatigue.variationMuscleMap[ex];
      if (!perEx || typeof perEx !== 'object' || !draft.exercises.includes(ex)) {
        delete draft.fatigue.variationMuscleMap[ex];
        dirty = true;
        continue;
      }

      const variationCount = (draft.variationsDict[ex] || []).length;
      for (const idxKey of Object.keys(perEx)) {
        const idx = Number(idxKey);
        const map = perEx[idxKey];
        if (!Number.isInteger(idx) || idx < 0 || idx >= variationCount || !map || typeof map !== 'object') {
          delete perEx[idxKey];
          dirty = true;
          continue;
        }

        map.primary = Array.isArray(map.primary) ? map.primary.filter((m: unknown) => muscleGroups.includes(m as string)) : [];
        map.secondary = Array.isArray(map.secondary)
          ? map.secondary.filter((m: unknown) => muscleGroups.includes(m as string)) : [];
      }
    }
  } else if (!absent(draft.fatigue.variationMuscleMap)) {
    delete draft.fatigue.variationMuscleMap;
    dirty = true;
  }

  if (absent(draft.warmup)) {
    draft.warmup = {};
    fill('Warm-up');
    dirty = true;
  } else if (typeof draft.warmup !== 'object') {
    draft.warmup = {};
    bad('Warm-up');
    dirty = true;
  }

  for (const ex of draft.exercises) {
    const pref = draft.warmup[ex];
    if (absent(pref)) {
      draft.warmup[ex] = { ...DEFAULT_WARMUP };
      fill(`Warm-up (${ex})`);
      dirty = true;
      continue;
    }
    if (typeof pref !== 'object') {
      draft.warmup[ex] = { ...DEFAULT_WARMUP };
      bad(`Warm-up (${ex})`);
      dirty = true;
      continue;
    }

    let prefIssue = false;
    if (absent(pref.sets)) {
      pref.sets = DEFAULT_WARMUP.sets;
      dirty = true;
    } else if (!Number.isInteger(pref.sets) || pref.sets < WARMUP_SETS_MIN || pref.sets > WARMUP_SETS_MAX) {
      pref.sets = DEFAULT_WARMUP.sets;
      prefIssue = true;
      dirty = true;
    }

    if (absent(pref.startPct)) {
      pref.startPct = DEFAULT_WARMUP.startPct;
      dirty = true;
    } else if (
      typeof pref.startPct !== 'number'
      || pref.startPct < WARMUP_START_PCT_MIN
      || pref.startPct > WARMUP_START_PCT_MAX
    ) {
      pref.startPct = DEFAULT_WARMUP.startPct;
      prefIssue = true;
      dirty = true;
    }

    if (prefIssue) {
      bad(`Warm-up (${ex})`);
    }
  }

  if (calendarDropped > 0) {
    bad(`Calendar (${calendarDropped} invalid ${calendarDropped === 1 ? 'entry' : 'entries'} removed)`);
  }
  if (loggedDropped > 0) {
    bad(`Logged weights (${loggedDropped} invalid ${loggedDropped === 1 ? 'value' : 'values'} removed)`);
  }
  if (loggedMaxDropped > 0) {
    bad(`Pinned 1RMs (${loggedMaxDropped} invalid ${loggedMaxDropped === 1 ? 'value' : 'values'} removed)`);
  }
  if (customWorkoutsDropped > 0) {
    bad(`Custom workouts (${customWorkoutsDropped} invalid ${customWorkoutsDropped === 1 ? 'entry' : 'entries'} removed)`);
  }
  if (customProgramsDropped > 0) {
    bad(`Custom programs (${customProgramsDropped} invalid ${customProgramsDropped === 1 ? 'entry' : 'entries'} removed)`);
  }

  return dirty;
}

export function saveState(): void {
  localStorage.setItem('pl_state', JSON.stringify(state));
}

function migratePullup(draft: any): void {
  if (draft.exercises.includes('pullup') || localStorage.getItem('pullup_migrated')) {
    return;
  }

  draft.exercises.push('pullup');
  draft.variationsDict['pullup'] = ['Weighted Pullup', 'Bodyweight Pullup', 'Chin-up', 'Neutral Grip'];
  draft.allowedPrograms['pullup'] = [...pullupPrograms];
  draft.allowedVariations['pullup'] = [0, 1, 2, 3];
  draft.increments['pullup'] = draft.global.unit === 'kg' ? PULLUP_INCREMENT.kg : PULLUP_INCREMENT.lbs;
  draft.lifts['pullup'] = { max: 100, program: 'pullup_double', variation: 0 };
  localStorage.setItem('pullup_migrated', 'true');
}

function migrateRpeV2(draft: any): void {
  if (localStorage.getItem('rpe_v2_migrated')) {
    return;
  }

  for (const ex of draft.exercises) {
    if (ex === 'pullup') {
      continue;
    }
    if (!draft.allowedPrograms[ex]) {
      draft.allowedPrograms[ex] = [...regularPrograms];
    }

    for (const prog of ['rpe_3day', 'rpe_2day', 'rpe_peaking']) {
      if (!draft.allowedPrograms[ex].includes(prog)) {
        draft.allowedPrograms[ex].push(prog);
      }
    }
    draft.allowedPrograms[ex] = draft.allowedPrograms[ex].filter((prog: string) => !pullupPrograms.includes(prog));
  }

  localStorage.setItem('rpe_v2_migrated', 'true');
  localStorage.setItem('pl_state', JSON.stringify(draft));
}

function applyBenchHostDefaults(draft: any): void {
  if (!draft.lifts.bench) {
    return;
  }

  if (!Array.isArray(draft.allowedPrograms.bench)) {
    draft.allowedPrograms.bench = [...regularPrograms];
  }
  if (!draft.allowedPrograms.bench.includes('peaking')) {
    draft.allowedPrograms.bench.push('peaking');
  }
  draft.lifts.bench.program = 'peaking';
}

function applyOhpHostDefaults(draft: any): void {
  if (!draft.lifts.ohp) {
    return;
  }

  const variations = draft.variationsDict.ohp || (draft.variationsDict.ohp = ['Main OHP', 'Push Press']);
  if (!variations.includes('Close Grip OHP')) {
    variations.push('Close Grip OHP');
  }

  const idx = variations.indexOf('Close Grip OHP');
  if (!Array.isArray(draft.allowedVariations.ohp)) {
    draft.allowedVariations.ohp = variations.map((_: unknown, i: number) => i);
  }
  if (!draft.allowedVariations.ohp.includes(idx)) {
    draft.allowedVariations.ohp.push(idx);
    draft.allowedVariations.ohp.sort((a: number, b: number) => a - b);
  }
  draft.lifts.ohp.variation = idx;
}

function migrateHostDefaults(draft: any): void {
  if (localStorage.getItem('host_defaults_v3_migrated')) {
    return;
  }

  draft.global.nav = defaultNavConfig();
  draft.global.controls = defaultControlsConfig();
  applyBenchHostDefaults(draft);
  applyOhpHostDefaults(draft);
  localStorage.setItem('host_defaults_v3_migrated', 'true');
  localStorage.setItem('pl_state', JSON.stringify(draft));
}

function migrateDialogPosition(draft: any): void {
  if (localStorage.getItem('dialog_pos_v2_migrated')) {
    return;
  }

  draft.global.dialogOffset = DEFAULT_DIALOG_OFFSET;
  localStorage.setItem('dialog_pos_v2_migrated', 'true');
  localStorage.setItem('pl_state', JSON.stringify(draft));
}

export function initState(): State {
  const raw = localStorage.getItem('pl_state');
  const draft: any = (raw ? JSON.parse(raw) : null) || clone(defaultState);

  const stateDirty = normalizeState(draft);

  migratePullup(draft);
  migrateRpeV2(draft);
  migrateHostDefaults(draft);
  migrateDialogPosition(draft);

  if (normalizeState(draft) || stateDirty) {
    localStorage.setItem('pl_state', JSON.stringify(draft));
  }

  state = draft as State;
  return state;
}
