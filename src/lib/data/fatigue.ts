import type { MuscleMapEntry, Tolerance } from '../types';

export const DEFAULT_PERIPHERAL_FACTOR = 0.5;

export const NEAR_MRV_FRACTION = 0.85;

export const muscleGroups = [
  'chest', 'back', 'shoulders', 'triceps', 'biceps',
  'quads', 'hamstrings', 'glutes', 'lowerback',
];

export const muscleGroupsDict: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', triceps: 'Triceps',
  biceps: 'Biceps', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  lowerback: 'Lower Back',
};

export const defaultMuscleMap: Record<string, MuscleMapEntry> = {
  bench: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  squat: { primary: ['quads'], secondary: ['glutes', 'hamstrings', 'lowerback'] },
  deadlift: { primary: ['back', 'hamstrings'], secondary: ['glutes', 'lowerback'] },
  ohp: { primary: ['shoulders'], secondary: ['triceps'] },
  pullup: { primary: ['back'], secondary: ['biceps'] },
};

export const defaultTolerance: Record<string, Tolerance> = {
  chest: { mev: 8, mrv: 22 },
  back: { mev: 10, mrv: 25 },
  shoulders: { mev: 8, mrv: 26 },
  triceps: { mev: 6, mrv: 18 },
  biceps: { mev: 8, mrv: 20 },
  quads: { mev: 8, mrv: 20 },
  hamstrings: { mev: 6, mrv: 16 },
  glutes: { mev: 4, mrv: 16 },
  lowerback: { mev: 4, mrv: 12 },
};
