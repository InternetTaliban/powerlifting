import { getState, setState, normalizeState, saveState } from '../lib/state';
import { commit, touch, ui } from './store';
import type { ModalType } from './store';
import { convertMaxGymMath, rowIdBlock, makeRowId } from '../lib/calc';
import {
  roundingList, regularPrograms, pullupPrograms, programs, defaultTolerance,
  defaultNavConfig, defaultControlsConfig, NAV_KEYS,
  DEFAULT_INCREMENT, NEW_EXERCISE_DEFAULT_MAX, BLOCK_WEEKS, DAYS_PER_WEEK,
  DEFAULT_DIALOG_OFFSET, THUMB_REACH_DIALOG_OFFSET, DIALOG_OFFSET_MIN, DIALOG_OFFSET_MAX,
} from '../lib/data';
import { NAV_ITEMS } from '../lib/nav';
import { ensureFatigueState } from '../lib/fatigue';
import { ensureWarmupState } from '../lib/warmup';
import { ensureMasterSplit } from '../lib/masterSplit';
import { weekIndexFromRowId } from '../lib/rowId';
import { snappyScrollTo } from '../util/scroll';
import { formatDate, formatDisplayDate } from '../util/date';
import type {
  ControlLocation, ImportIssue, NavFabs, NavKey, NavLocation, NormalizeReport,
  RepModifiers, RevealControl, State, Unit, ViewId,
} from '../lib/types';

const SCROLL_ANIM_MS = 450;
const JUMP_HEADER_OFFSET_PX = 130;
const JUMP_RENDER_DELAY_MS = 80;
const JUMP_FLASH_FADE_MS = 650;
const JUMP_FLASH_CLEAR_MS = 1700;

export function setActiveView(view: ViewId): void {
  ui.activeView = view;
  window.scrollTo(0, 0);
  touch();
}

export function toggleView(view: ViewId): void {
  setActiveView(ui.activeView === view ? 'mainView' : view);
}

export function openPlatesView(weekIndex: number): void {
  ui.platesWeekIndex = weekIndex;
  setActiveView('platesView');
}

export function runNavItem(key: NavKey): void {
  const item = NAV_ITEMS[key];
  if (!item) {
    return;
  }

  if (item.isToday) {
    openModal('today');
  } else if (item.view) {
    toggleView(item.view);
  }
}

function flashProgramRow(row: HTMLElement): void {
  row.classList.add('jump-highlight');
  setTimeout(() => {
    row.classList.add('jump-fading');
    setTimeout(() => row.classList.remove('jump-highlight', 'jump-fading'), JUMP_FLASH_CLEAR_MS);
  }, JUMP_FLASH_FADE_MS);
}

function scrollToProgramRow(rowId: string, ex: string): void {
  const row = document.querySelector(`#programContainer tr[data-row-id="${CSS.escape(rowId)}"]`) as HTMLElement | null;
  if (!row) {
    showToast(`${ex.toUpperCase()} now uses a different program, so this workout isn't in its current table.`);
    return;
  }

  snappyScrollTo(row.getBoundingClientRect().top + window.scrollY - JUMP_HEADER_OFFSET_PX, SCROLL_ANIM_MS);
  flashProgramRow(row);
}

export function goToProgramRow(rowId: string, ex: string): void {
  const state = getState();
  if (!state.exercises.includes(ex)) {
    return;
  }

  closeAllModals();
  setActiveView('mainView');
  if (state.activeLift !== ex) {
    switchLift(ex);
  }

  setTimeout(() => scrollToProgramRow(rowId, ex), JUMP_RENDER_DELAY_MS);
}

export function openModal(type: ModalType, props?: Record<string, unknown>): void {
  ui.modals.push({ type, props });
  touch();
}

export function closeModal(): void {
  ui.modals.pop();
  touch();
}

export function closeAllModals(): void {
  ui.modals.length = 0;
  touch();
}

let toastKey = 0;

export function showToast(message: string): void {
  ui.toast = { message, key: ++toastKey };
  touch();
}

export function clearToast(): void {
  ui.toast = null;
  touch();
}

export function showConfirm(
  message: string,
  onConfirm: () => void,
  danger = false,
  opts?: { confirmLabel?: string; details?: ImportIssue[] },
): void {
  ui.confirm = { message, onConfirm, danger, confirmLabel: opts?.confirmLabel, details: opts?.details };
  touch();
}

export function clearConfirm(): void {
  ui.confirm = null;
  touch();
}

export function showAlert(message: string, onOk?: () => void): void {
  ui.alert = { message, onOk };
  touch();
}

export function clearAlert(): void {
  ui.alert = null;
  touch();
}

export function switchLift(lift: string): void {
  const state = getState();
  if (!state.exercises.includes(lift)) {
    lift = state.exercises[0];
  }

  state.activeLift = lift;
  ui.repAdjustersOpen = false;
  commit();
}

function clearLoggedForLift(lift: string): void {
  const state = getState();
  const block = (state.lifts[lift]?.block) || 0;

  for (const key of Object.keys(state.logged || {})) {
    if (key.startsWith(`${lift}-`) && rowIdBlock(key) === block) {
      delete state.logged[key];
    }
  }
}

export function setLiftMax(value: number): boolean {
  const state = getState();
  if (isNaN(value) || value <= 0) {
    showAlert('1 Rep Max must be a positive number.');
    return false;
  }

  if (value !== state.lifts[state.activeLift].max) {
    state.lifts[state.activeLift].max = value;
    clearLoggedForLift(state.activeLift);
  }

  commit();
  return true;
}

export function cycleUnit(): void {
  const state = getState();
  const oldUnit: Unit = state.global.unit;
  state.global.unit = oldUnit === 'kg' ? 'lbs' : 'kg';

  for (const ex of Object.keys(state.lifts)) {
    state.lifts[ex].max = convertMaxGymMath(state.lifts[ex].max, oldUnit);
  }

  for (const ex of Object.keys(state.increments)) {
    state.increments[ex] = oldUnit === 'kg' ? state.increments[ex] * 2 : state.increments[ex] / 2;
  }

  for (const entry of Object.values(state.logged || {})) {
    for (const key of Object.keys(entry)) {
      if (entry[key] != null) {
        entry[key] = convertMaxGymMath(entry[key], oldUnit);
      }
    }
  }

  commit();
}

export function cycleRounding(): void {
  const state = getState();
  const currentIndex = roundingList.indexOf(state.global.rounding);
  state.global.rounding = roundingList[(currentIndex + 1) % roundingList.length];
  commit();
}

export function toggleRoughLoads(): void {
  const state = getState();
  state.global.roughLoads = !state.global.roughLoads;
  commit();
}

export function selectProgram(progKey: string): void {
  const state = getState();
  state.lifts[state.activeLift].program = progKey;
  commit();
  closeModal();
}

export function selectVariation(idx: number): void {
  const state = getState();
  state.lifts[state.activeLift].variation = idx;
  commit();
  closeModal();
}

export function setRepModifier(range: keyof RepModifiers, value: number): void {
  const state = getState();
  const lift = state.lifts[state.activeLift];
  if (!lift.repModifiers) {
    lift.repModifiers = { singles: 0, triples: 0, volume: 0 };
  }

  lift.repModifiers[range] = value;
  commit();
}

export function toggleRepAdjusters(): void {
  ui.repAdjustersOpen = !ui.repAdjustersOpen;
  touch();
}

export function toggleRowComplete(rowId: string): void {
  const state = getState();
  if (state.completed[rowId]) {
    delete state.completed[rowId];
  } else {
    state.completed[rowId] = true;
  }
  commit();
}

export function progressCycle(): void {
  const state = getState();
  const lift = state.activeLift;
  const liftData = state.lifts[lift];
  const fallbackIncrement = state.global.unit === 'kg' ? DEFAULT_INCREMENT.kg : DEFAULT_INCREMENT.lbs;

  liftData.max += state.increments[lift] || fallbackIncrement;
  liftData.block = (liftData.block || 0) + 1;

  commit();
  snappyScrollTo(0, SCROLL_ANIM_MS);
}

export function toggleBackPosition(): void {
  const state = getState();
  state.global.backPosition = state.global.backPosition === 'bottom' ? 'top' : 'bottom';
  commit();
}

export function setDialogOffset(value: number | string): void {
  const state = getState();
  const parsed = parseInt(String(value), 10);
  state.global.dialogOffset = isNaN(parsed)
    ? DEFAULT_DIALOG_OFFSET
    : Math.min(DIALOG_OFFSET_MAX, Math.max(DIALOG_OFFSET_MIN, parsed));
  commit();
}

export function setNavLayout(key: string, location: NavLocation): void {
  const item = NAV_ITEMS[key as NavKey];
  if (item && item.essential && location === 'hidden') {
    return;
  }

  getState().global.nav.layout[key] = location;
  commit();
}

export function moveNavButton(key: string, dir: number): void {
  const order = getState().global.nav.order;
  const index = order.indexOf(key);
  const target = index + dir;
  if (index < 0 || target < 0 || target >= order.length) {
    return;
  }

  [order[index], order[target]] = [order[target], order[index]];
  commit();
}

export function setRevealControl(mode: RevealControl): void {
  getState().global.nav.revealControl = mode === 'menu' ? 'menu' : 'settings';
  commit();
}

export function toggleShowHidden(): void {
  const cfg = getState().global.nav;
  cfg.showHidden = !cfg.showHidden;
  commit();
}

export function toggleFab(key: keyof NavFabs): void {
  const fabs = getState().global.nav.fabs;
  fabs[key] = !fabs[key];
  commit();
}

export function applyThumbReachPreset(): void {
  const state = getState();
  const cfg = state.global.nav;

  for (const key of NAV_KEYS) {
    if (cfg.layout[key] !== 'hidden') {
      cfg.layout[key] = 'bottom';
    }
  }

  state.global.backPosition = 'bottom';
  state.global.dialogOffset = THUMB_REACH_DIALOG_OFFSET;
  commit();
}

function applyDesignDefaults(): void {
  const state = getState();
  state.global.nav = defaultNavConfig();
  state.global.controls = defaultControlsConfig();
  commit();
}

export function resetNavDesign(): void {
  showConfirm('Reset the navigation and control layout to defaults?', applyDesignDefaults);
}

export function setControlLayout(key: string, location: ControlLocation): void {
  getState().global.controls.layout[key] = location;
  commit();
}

export function moveControl(key: string, dir: number): void {
  const order = getState().global.controls.order;
  const index = order.indexOf(key);
  const target = index + dir;
  if (index < 0 || target < 0 || target >= order.length) {
    return;
  }

  [order[index], order[target]] = [order[target], order[index]];
  commit();
}

export function exportSettings(): void {
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = `benchapp-${new Date().toISOString().slice(0, 10)}.json`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
  showToast(`Exported ${filename}`);
}

export function cycleFatigueWeek(): void {
  ensureFatigueState();
  const state = getState();
  state.fatigue.week = (state.fatigue.week + 1) % BLOCK_WEEKS;
  commit();
}

export function updateTolerance(muscle: string, key: 'mev' | 'mrv', val: string): void {
  const parsed = parseFloat(val);
  if (isNaN(parsed) || parsed < 0) {
    showAlert('Volume landmark must be a non-negative number.');
    touch();
    return;
  }

  ensureFatigueState();
  const state = getState();
  if (!state.fatigue.tolerance[muscle]) {
    state.fatigue.tolerance[muscle] = { mev: 0, mrv: 0 };
  }

  state.fatigue.tolerance[muscle][key] = parsed;
  commit();
}

function applyToleranceDefaults(): void {
  ensureFatigueState();
  getState().fatigue.tolerance = JSON.parse(JSON.stringify(defaultTolerance));
  commit();
}

export function resetFatigueTolerance(): void {
  showConfirm('Reset all volume landmarks (MEV/MRV) to defaults?', applyToleranceDefaults);
}

// A relaxed gate: the import only has to look like a BenchApp export. Anything
// recognizable is handed to normalizeState, which fills missing fields with the
// defaults and salvages/reports the corrupt ones (see importStateFromText).
export function isImportableState(obj: any): boolean {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj)
    && (obj.lifts !== undefined || obj.exercises !== undefined || obj.global !== undefined);
}

function applyImportedState(imported: any, onDone: () => void): void {
  setState(imported as State);
  ensureMasterSplit();
  saveState();

  if (getState().activeLift) {
    switchLift(getState().activeLift);
  } else {
    commit();
  }

  showToast('Settings imported.');
  onDone();
}

export function importStateFromText(text: string, onDone: () => void): void {
  let imported: any;
  try {
    imported = JSON.parse(text);
  } catch {
    showAlert('Could not read this file. Make sure it is a BenchApp settings export (.json).');
    onDone();
    return;
  }

  if (!isImportableState(imported)) {
    showAlert('This does not look like a BenchApp settings file.');
    onDone();
    return;
  }

  // Normalize the imported object up front: defaults fill anything missing, and
  // the report collects the present-but-incompatible settings to show the user.
  const report: NormalizeReport = { filled: [], issues: [] };
  normalizeState(imported, report);

  if (report.issues.length === 0) {
    showConfirm('Import settings? This will overwrite all current data.', () => applyImportedState(imported, onDone));
    onDone();
    return;
  }

  const message = 'Some settings in this file aren’t compatible with this version of BenchApp. '
    + 'Force apply will recover what it can and use the defaults for the rest.';
  showConfirm(message, () => applyImportedState(imported, onDone), false, {
    confirmLabel: 'Force apply',
    details: report.issues,
  });
  onDone();
}

function clearAllStoredState(): void {
  const keys = [
    'pl_state', 'pullup_migrated', 'rpe_v2_migrated', 'host_defaults_v3_migrated', 'dialog_pos_v2_migrated',
  ];
  for (const key of keys) {
    localStorage.removeItem(key);
  }
  location.reload();
}

export function factoryReset(): void {
  showConfirm(
    'Factory reset? This permanently erases everything — your lifts, 1RMs, logged weights, PRs, planner, and all settings — and restores the app to a fresh install. This cannot be undone.',
    clearAllStoredState,
    true,
  );
}

export function cycleCalendarWeek(): void {
  const state = getState();
  state.global.calendarWeek = (state.global.calendarWeek + 1) % BLOCK_WEEKS;
  commit();
}

export function toggleCalendarDone(rowId: string): void {
  const state = getState();
  if (state.completed[rowId]) {
    delete state.completed[rowId];
  } else {
    state.completed[rowId] = true;
  }
  commit();
}

export function assignCalendar(rowId: string, dateStr: string): void {
  const state = getState();
  if (dateStr !== 'unassigned') {
    state.calendar[rowId] = dateStr;
    commit();
    return;
  }

  delete state.calendar[rowId];
  const week = weekIndexFromRowId(rowId);
  if (week !== null) {
    state.global.calendarWeek = week;
  }
  commit();
}

export function hideCalendarRow(rowId: string): void {
  getState().calendar[rowId] = 'hidden';
  commit();
}

function clearWeekAssignments(weekStart: Date): void {
  const state = getState();

  const days: string[] = [];
  for (let i = 0; i < DAYS_PER_WEEK; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    days.push(formatDate(date));
  }

  for (const rowId of Object.keys(state.calendar)) {
    if (days.includes(state.calendar[rowId])) {
      delete state.calendar[rowId];
    }
  }

  commit();
}

export function clearCalendarWeek(weekStart: Date): void {
  showConfirm(
    'Clear all assignments from the 7-day calendar currently on screen?',
    () => clearWeekAssignments(weekStart),
  );
}

export function restoreHiddenWorkouts(): void {
  const state = getState();
  let count = 0;

  for (const rowId of Object.keys(state.calendar)) {
    if (state.calendar[rowId] === 'hidden' && rowId.includes(`-w${state.global.calendarWeek}-`)) {
      delete state.calendar[rowId];
      count++;
    }
  }

  if (count > 0) {
    commit();
  } else {
    showAlert('No deleted workouts in this block week to restore.');
  }
}

function assignSplitDay(state: State, weekStart: Date, weekIdx: number, weekday: number): void {
  const slots = state.masterSplit?.[weekday] || [];
  if (slots.length === 0) {
    return;
  }

  const targetDate = new Date(weekStart);
  targetDate.setDate(targetDate.getDate() + weekday);
  const dateStr = formatDate(targetDate);

  for (const slot of slots) {
    const activeData = state.lifts[slot.ex];
    if (!activeData) {
      continue;
    }

    const targetWeek = programs[activeData.program] && programs[activeData.program][weekIdx];
    const dayObj = targetWeek && targetWeek.days[slot.d];
    if (!dayObj || dayObj.isRest) {
      continue;
    }

    const rowId = makeRowId(slot.ex, activeData.program, weekIdx, slot.d, activeData.block || 0);
    state.calendar[rowId] = dateStr;
  }
}

function assignSplitToWeek(weekStart: Date): void {
  const state = getState();
  const weekIdx = state.global.calendarWeek;

  for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday++) {
    assignSplitDay(state, weekStart, weekIdx, weekday);
  }

  commit();
}

export function autoAssignMasterSplit(weekStart: Date): void {
  ensureMasterSplit();
  showConfirm(
    'Auto-assign active Block Week workouts to this week using your Master Split?',
    () => assignSplitToWeek(weekStart),
  );
}

function genCustomId(): string {
  return 'cw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

export function saveCustomWorkout(name: string, note: string): boolean {
  if (!name.trim()) {
    showAlert('Give the workout a name first.');
    return false;
  }

  const state = getState();
  if (!state.customWorkouts) {
    state.customWorkouts = {};
  }

  state.customWorkouts[genCustomId()] = { name: name.trim(), note: note.trim() };
  commit();
  showToast('Custom workout added to Unassigned.');
  return true;
}

function removeCustomWorkout(id: string): void {
  const state = getState();
  delete state.customWorkouts[id];
  delete state.calendar[id];
  delete state.completed[id];
  commit();
}

export function deleteCustomWorkout(id: string): void {
  showConfirm('Delete this custom workout? This cannot be undone.', () => removeCustomWorkout(id), true);
}

export function unassignCustomWorkout(id: string): void {
  delete getState().calendar[id];
  commit();
}

export function assignSlotToDay(ex: string, dayIndex: number, targetWeekday: number): void {
  const state = getState();
  ensureMasterSplit();

  for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday++) {
    state.masterSplit![weekday] = (state.masterSplit![weekday] || [])
      .filter((slot) => !(slot.ex === ex && slot.d === dayIndex));
  }

  state.masterSplit![targetWeekday].push({ ex, d: dayIndex });
  commit();
}

export function removeSlotFromDay(ex: string, dayIndex: number, weekday: number): void {
  const state = getState();
  state.masterSplit![weekday] = (state.masterSplit![weekday] || [])
    .filter((slot) => !(slot.ex === ex && slot.d === dayIndex));
  commit();
}

export function resetMasterSplit(rebuild: () => Record<number, { ex: string; d: number }[]>): void {
  const applyReset = () => {
    getState().masterSplit = rebuild();
    commit();
  };
  showConfirm('Reset the master split to the default layout?', applyReset);
}

function removeExercise(ex: string): void {
  const state = getState();
  state.exercises = state.exercises.filter((name) => name !== ex);
  delete state.variationsDict[ex];
  delete state.allowedPrograms[ex];
  delete state.allowedVariations[ex];
  delete state.increments[ex];
  delete state.lifts[ex];
  if (state.fatigue?.muscleMap) {
    delete state.fatigue.muscleMap[ex];
  }

  for (const key of Object.keys(state.completed)) {
    if (key.startsWith(`${ex}-`)) {
      delete state.completed[key];
    }
  }
  for (const key of Object.keys(state.logged || {})) {
    if (key.startsWith(`${ex}-`)) {
      delete state.logged[key];
    }
  }

  if (state.activeLift === ex) {
    state.activeLift = state.exercises[0] || '';
  }
  commit();
}

export function deleteExercise(ex: string): void {
  showConfirm(`Delete "${ex}"? This cannot be undone.`, () => removeExercise(ex), true);
}

export function saveNewExercise(rawName: string, rawVars: string): boolean {
  const state = getState();
  const name = rawName.trim().toLowerCase();
  const vars = rawVars.split(',').map((item) => item.trim()).filter((item) => item !== '');
  if (!name) {
    showAlert('Please enter an exercise name.');
    return false;
  }
  if (state.exercises.includes(name)) {
    showAlert('An exercise with that name already exists.');
    return false;
  }

  const variations = vars.length > 0 ? vars : ['Main ' + name];
  state.exercises.push(name);
  state.variationsDict[name] = variations;
  state.allowedPrograms[name] = [...regularPrograms];
  state.allowedVariations[name] = variations.map((_, i) => i);
  state.increments[name] = state.global.unit === 'kg' ? DEFAULT_INCREMENT.kg : DEFAULT_INCREMENT.lbs;
  state.lifts[name] = { max: NEW_EXERCISE_DEFAULT_MAX, program: 'building', variation: 0, block: 0 };
  ensureFatigueState();
  state.fatigue.muscleMap[name] = { primary: [], secondary: [] };

  closeModal();
  switchLift(name);
  return true;
}

function renameExerciseKeys(map: Record<string, unknown>, oldName: string, newName: string): void {
  for (const key of Object.keys(map)) {
    if (key.startsWith(`${oldName}-`)) {
      map[key.replace(`${oldName}-`, `${newName}-`)] = map[key];
      delete map[key];
    }
  }
}

function renameExercise(state: State, oldName: string, newName: string, variations: string[]): void {
  state.exercises[state.exercises.indexOf(oldName)] = newName;
  state.variationsDict[newName] = variations;
  delete state.variationsDict[oldName];
  state.allowedPrograms[newName] = state.allowedPrograms[oldName];
  delete state.allowedPrograms[oldName];
  state.allowedVariations[newName] = state.allowedVariations[oldName];
  delete state.allowedVariations[oldName];
  state.increments[newName] = state.increments[oldName];
  delete state.increments[oldName];
  state.lifts[newName] = state.lifts[oldName];
  delete state.lifts[oldName];
  if (state.fatigue?.muscleMap) {
    state.fatigue.muscleMap[newName] = state.fatigue.muscleMap[oldName] || { primary: [], secondary: [] };
    delete state.fatigue.muscleMap[oldName];
  }

  renameExerciseKeys(state.completed, oldName, newName);
  renameExerciseKeys(state.calendar, oldName, newName);
  renameExerciseKeys(state.logged || {}, oldName, newName);
  if (state.activeLift === oldName) {
    state.activeLift = newName;
  }
}

export function saveEditExercise(oldName: string, rawName: string, rawVars: string): boolean {
  const state = getState();
  const newName = rawName.trim().toLowerCase();
  const newVars = rawVars.split(',').map((item) => item.trim()).filter((item) => item !== '');
  if (!newName) {
    showAlert('Please enter an exercise name.');
    return false;
  }
  if (newName !== oldName && state.exercises.includes(newName)) {
    showAlert('That exercise name is already taken.');
    return false;
  }

  const variations = newVars.length > 0 ? newVars : ['Main ' + newName];
  if (newName !== oldName) {
    renameExercise(state, oldName, newName, variations);
  } else {
    state.variationsDict[newName] = variations;
  }

  state.allowedVariations[newName] = state.allowedVariations[newName].filter((index) => index < variations.length);
  if (state.allowedVariations[newName].length === 0) {
    state.allowedVariations[newName] = [0];
  }
  if (state.lifts[newName].variation >= variations.length) {
    state.lifts[newName].variation = 0;
  }

  closeModal();
  switchLift(state.activeLift);
  return true;
}

export function updateIncrement(ex: string, val: string): void {
  const parsed = parseFloat(val);
  if (isNaN(parsed) || parsed < 0) {
    showAlert('Cycle increment must be a non-negative number.');
    touch();
    return;
  }

  getState().increments[ex] = parsed;
  commit();
}

export function toggleProgramAccess(ex: string, program: string, enabled: boolean): void {
  const state = getState();
  const validPool = ex === 'pullup' ? pullupPrograms : regularPrograms;
  let allowed = state.allowedPrograms[ex];

  if (enabled && !allowed.includes(program)) {
    allowed.push(program);
  } else if (!enabled && allowed.includes(program)) {
    const remaining = allowed.filter((prog) => validPool.includes(prog));
    if (remaining.length <= 1) {
      showAlert('You must leave at least one program enabled.');
      touch();
      return;
    }
    allowed = allowed.filter((prog) => prog !== program);
  }

  state.allowedPrograms[ex] = allowed;
  if (!allowed.includes(state.lifts[ex].program)) {
    state.lifts[ex].program = allowed[0];
  }
  commit();
}

export function toggleVariationAccess(ex: string, idx: number, enabled: boolean): void {
  const state = getState();
  let allowed = state.allowedVariations[ex];

  if (enabled && !allowed.includes(idx)) {
    allowed.push(idx);
  } else if (!enabled && allowed.includes(idx)) {
    if (allowed.length === 1) {
      showAlert('You must leave at least one variation enabled.');
      touch();
      return;
    }
    allowed = allowed.filter((index) => index !== idx);
  }

  allowed.sort((a, b) => a - b);
  state.allowedVariations[ex] = allowed;
  if (!allowed.includes(state.lifts[ex].variation)) {
    state.lifts[ex].variation = allowed[0];
  }
  commit();
}

export function toggleMuscle(ex: string, muscle: string, role: 'primary' | 'secondary', enabled: boolean): void {
  ensureFatigueState();
  const state = getState();
  const map = state.fatigue.muscleMap[ex] || (state.fatigue.muscleMap[ex] = { primary: [], secondary: [] });
  const other = role === 'primary' ? 'secondary' : 'primary';

  if (!enabled) {
    map[role] = map[role].filter((name) => name !== muscle);
    commit();
    return;
  }

  if (!map[role].includes(muscle)) {
    map[role].push(muscle);
  }
  map[other] = map[other].filter((name) => name !== muscle);
  commit();
}

export function updatePeripheralFactor(val: string): void {
  const parsed = parseFloat(val);
  if (isNaN(parsed) || parsed < 0 || parsed > 1) {
    showAlert('Peripheral fatigue factor must be between 0 and 1.');
    touch();
    return;
  }

  ensureFatigueState();
  getState().fatigue.peripheralFactor = parsed;
  commit();
}

export function setWarmupSets(value: number): void {
  ensureWarmupState();
  getState().warmup[getState().activeLift].sets = value;
  commit();
}

export function setWarmupStart(pctWhole: number): void {
  ensureWarmupState();
  getState().warmup[getState().activeLift].startPct = pctWhole / 100;
  commit();
}

export function saveLoggedWeight(rowId: string, data: Record<string, number>): void {
  const state = getState();
  if (!state.logged) {
    state.logged = {};
  }

  state.logged[rowId] = { ...data };
  commit();
  closeModal();
}

export function resetLoggedWeight(rowId: string): void {
  const state = getState();
  if (state.logged && state.logged[rowId]) {
    delete state.logged[rowId];
    commit();
  }
  closeModal();
}

export function saveLogWorkout(args: {
  ex: string; week: number; day: number; max: number; date: string; markDone: boolean;
}): boolean {
  const state = getState();
  const { ex, week, day, max, date, markDone } = args;

  const prog = state.lifts[ex]?.program;
  if (!ex || !prog) {
    showAlert('Pick an exercise with a valid program.');
    return false;
  }
  if (isNaN(week) || isNaN(day)) {
    showAlert('Pick a training week and day.');
    return false;
  }
  if (isNaN(max) || max <= 0) {
    showAlert('Enter a 1 Rep Max greater than zero.');
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    showAlert('Pick a valid date.');
    return false;
  }

  const weekData = programs[prog]?.[week];
  const dayObj = weekData && weekData.days[day];
  if (!dayObj || dayObj.isRest) {
    showAlert('That day is a rest day — pick a training day.');
    return false;
  }

  const block = state.lifts[ex]?.block || 0;
  const rowId = makeRowId(ex, prog, week, day, block);
  state.calendar[rowId] = date;
  if (!state.loggedMax) {
    state.loggedMax = {};
  }
  state.loggedMax[rowId] = max;
  if (markDone) {
    state.completed[rowId] = true;
  }

  commit();
  closeModal();

  const dayLabel = dayObj.name ? dayObj.name.split('(')[0].trim() : `Day ${day + 1}`;
  showToast(`Logged ${ex.toUpperCase()} · ${dayLabel} on ${formatDisplayDate(new Date(date + 'T00:00:00'))}.`);
  return true;
}
