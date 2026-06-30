import type { State } from '../types';
import { DEFAULT_DIALOG_OFFSET, DEFAULT_WARMUP } from './constants';
import { defaultNavConfig, defaultControlsConfig } from './navDefaults';
import { regularPrograms, pullupPrograms } from './programs';
import { DEFAULT_PERIPHERAL_FACTOR, defaultMuscleMap, defaultTolerance } from './fatigue';

export const defaultState: State = {
  global: {
    unit: 'kg', rounding: 'exact', calendarWeek: 0, navPosition: 'top', backPosition: 'bottom',
    alwaysShowBack: false, dialogOffset: DEFAULT_DIALOG_OFFSET, allow25kgPlates: true, roughLoads: false,
    showLoadsToggle: false,
    nav: defaultNavConfig(), controls: defaultControlsConfig(),
  },
  activeLift: 'bench',
  completed: {},
  calendar: {},
  customWorkouts: {},
  exercises: ['squat', 'bench', 'deadlift', 'ohp', 'pullup'],
  variationsDict: {
    squat: ['Main Squat', 'Pause Squat', 'Tempo Squat'],
    bench: ['Main Bench', 'Close Grip Bench'],
    deadlift: ['Main Deadlift', 'Deficit Deadlift'],
    ohp: ['Main OHP', 'Push Press', 'Close Grip OHP'],
    pullup: ['Weighted Pullup', 'Bodyweight Pullup', 'Chin-up', 'Neutral Grip'],
  },
  allowedPrograms: {
    squat: [...regularPrograms],
    bench: [...regularPrograms],
    deadlift: [...regularPrograms],
    ohp: [...regularPrograms],
    pullup: [...pullupPrograms],
  },
  allowedVariations: { squat: [0, 1, 2], bench: [0, 1], deadlift: [0, 1], ohp: [0, 1, 2], pullup: [0, 1, 2, 3] },
  customPrograms: {},
  increments: { squat: 2.5, bench: 2.5, deadlift: 2.5, ohp: 2.5, pullup: 1.25 },
  lifts: {
    squat: { max: 140, program: 'rpe_2day', variation: 1, block: 0 },
    bench: { max: 100, program: 'peaking', variation: 0, block: 0 },
    deadlift: { max: 180, program: 'rpe_2day', variation: 0, block: 0 },
    ohp: { max: 60, program: 'building', variation: 2, block: 0 },
    pullup: { max: 40, program: 'pullup_double', variation: 0, block: 0 },
  },
  logged: {},
  loggedMax: {},
  fatigue: {
    peripheralFactor: DEFAULT_PERIPHERAL_FACTOR,
    week: 0,
    muscleMap: JSON.parse(JSON.stringify(defaultMuscleMap)),
    tolerance: JSON.parse(JSON.stringify(defaultTolerance)),
  },
  warmup: {
    squat: { ...DEFAULT_WARMUP },
    bench: { ...DEFAULT_WARMUP },
    deadlift: { ...DEFAULT_WARMUP },
    ohp: { ...DEFAULT_WARMUP },
    pullup: { ...DEFAULT_WARMUP },
  },
};
