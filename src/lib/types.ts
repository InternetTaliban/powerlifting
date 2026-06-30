export type Unit = 'kg' | 'lbs';
export type Rounding = 'exact' | 'down' | 'up';
export type NavLocation = 'top' | 'bottom' | 'hidden';
export type ControlLocation = 'show' | 'hidden';
export type RevealControl = 'settings' | 'menu';

export type ViewId =
  | 'mainView'
  | 'calendarView'
  | 'scheduleView'
  | 'fatigueView'
  | 'platesView'
  | 'settingsView'
  | 'rpeView'
  | 'poboxView';

export type NavKey = 'today' | 'fatigue' | 'schedule' | 'planner' | 'settings' | 'pobox' | 'rpe';
export type ControlKey = 'max' | 'program' | 'variation' | 'adjust' | 'warmup' | 'loads';

export interface RepModifiers {
  singles: number;
  triples: number;
  volume: number;
}

export interface Lift {
  max: number;
  program: string;
  variation: number;
  block: number;
  repModifiers?: RepModifiers;
}

export interface ProgramSegment {
  sets: number;
  reps: number;
  pct: number;
  pctRange?: number;
}

export interface ProgramDay {
  name: string;
  isRest?: boolean;
  sets?: number;
  reps?: number | string;
  pct?: number;
  pctRange?: number;
  rpe?: string;
  backoff?: ProgramSegment;
  backoff2?: ProgramSegment;
  backoff3?: ProgramSegment;
}

export interface ProgramWeek {
  week: string;
  days: ProgramDay[];
}

export type Program = ProgramWeek[];

export interface CustomProgram {
  name: string;
  style: 'build' | 'peak';
  progressable: boolean;
  weeks: Program;
}

export interface NavFabs {
  today: boolean;
  scrollTop: boolean;
  goToTraining: boolean;
}

export interface NavConfig {
  order: string[];
  layout: Record<string, NavLocation>;
  revealControl: RevealControl;
  showHidden: boolean;
  fabs: NavFabs;
}

export interface ControlsConfig {
  order: string[];
  layout: Record<string, ControlLocation>;
}

export interface GlobalConfig {
  unit: Unit;
  rounding: Rounding;
  calendarWeek: number;
  navPosition: 'top' | 'bottom';
  backPosition: 'top' | 'bottom';
  alwaysShowBack: boolean;
  dialogOffset: number;
  allow25kgPlates: boolean;
  roughLoads: boolean;
  showLoadsToggle: boolean;
  nav: NavConfig;
  controls: ControlsConfig;
}

export interface MuscleMapEntry {
  primary: string[];
  secondary: string[];
}

export interface Tolerance {
  mev: number;
  mrv: number;
}

export interface FatigueState {
  peripheralFactor: number;
  week: number;
  muscleMap: Record<string, MuscleMapEntry>;
  tolerance: Record<string, Tolerance>;
  variationMuscleMap?: Record<string, Record<number, MuscleMapEntry>>;
}

export interface WarmupPref {
  sets: number;
  startPct: number;
}

export interface CustomWorkout {
  name: string;
  note: string;
}

export interface SplitSlot {
  ex: string;
  d: number;
}

// Import diagnostics produced by normalizeState when it is handed a report.
// `filled` = a field was absent and silently took its default (not surfaced).
// `issues` = a field was present but invalid; `recovered` means its value was
// salvaged, `default` means it was reset/dropped. Surfaced on the import screen.
export interface ImportIssue {
  setting: string;
  resolution: 'recovered' | 'default';
}

export interface NormalizeReport {
  filled: string[];
  issues: ImportIssue[];
}

export interface State {
  global: GlobalConfig;
  activeLift: string;
  completed: Record<string, boolean>;
  calendar: Record<string, string>;
  customWorkouts: Record<string, CustomWorkout>;
  exercises: string[];
  variationsDict: Record<string, string[]>;
  allowedPrograms: Record<string, string[]>;
  allowedVariations: Record<string, number[]>;
  customPrograms: Record<string, CustomProgram>;
  increments: Record<string, number>;
  lifts: Record<string, Lift>;
  logged: Record<string, Record<string, number>>;
  loggedMax: Record<string, number>;
  fatigue: FatigueState;
  warmup: Record<string, WarmupPref>;
  masterSplit?: Record<number, SplitSlot[]>;
}
