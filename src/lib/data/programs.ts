import type { Program } from '../types';

export const programsDict: Record<string, string> = {
  building: 'Base Build (3-Day)',
  building2day: 'Base Build (2-Day)',
  peaking: 'Peaking (Max)',
  pullup_double: 'Pullup Double',
  pullup_peak: 'Pullup Peaking',
  pullup_fighter: 'Pullup Fighter',
  rpe_3day: 'RPE (3-Day)',
  rpe_2day: 'RPE (2-Day)',
  rpe_peaking: 'RPE Peaking',
};

export const pullupPrograms = ['pullup_double', 'pullup_peak', 'pullup_fighter'];
export const regularPrograms = ['building', 'building2day', 'peaking', 'rpe_3day', 'rpe_2day', 'rpe_peaking'];
export const allPrograms = [...regularPrograms, ...pullupPrograms];

export const programs: Record<string, Program> = {
  building: [
    { week: '1: Accumulation', days: [
      { name: 'Day 1 (Volume)', sets: 4, reps: 6, pct: 0.70, rpe: '6 - 7' },
      { name: 'Day 2 (Triples)', sets: 3, reps: 3, pct: 0.75, rpe: '6.5' },
      { name: 'Day 3 (Single + Backoff)', sets: 1, reps: 1, pct: 0.80, backoff: { sets: 3, reps: 4, pct: 0.75 }, rpe: '7 - 7.5' },
    ] },
    { week: '2: Progression', days: [
      { name: 'Day 1 (Volume)', sets: 4, reps: 5, pct: 0.75, rpe: '7 - 7.5' },
      { name: 'Day 2 (Triples)', sets: 3, reps: 3, pct: 0.80, rpe: '7.5' },
      { name: 'Day 3 (Single + Backoff)', sets: 1, reps: 1, pct: 0.85, backoff: { sets: 3, reps: 3, pct: 0.80 }, rpe: '8' },
    ] },
    { week: '3: Overreach', days: [
      { name: 'Day 1 (Volume)', sets: 5, reps: 4, pct: 0.775, rpe: '8 - 8.5' },
      { name: 'Day 2 (Triples)', sets: 3, reps: 3, pct: 0.85, rpe: '8.5' },
      { name: 'Day 3 (Single + Backoff)', sets: 1, reps: 1, pct: 0.875, backoff: { sets: 3, reps: 2, pct: 0.825 }, rpe: '8.5 - 9' },
    ] },
    { week: '4: Deload', days: [
      { name: 'Day 1 (Recovery)', sets: 3, reps: 5, pct: 0.60, rpe: '5' },
      { name: 'Day 2 (Recovery)', sets: 3, reps: 3, pct: 0.60, rpe: '5' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
  ],
  building2day: [
    { week: '1: Accumulation', days: [
      { name: 'Day 1 (Single + Backoff)', sets: 1, reps: 1, pct: 0.80, backoff: { sets: 3, reps: 4, pct: 0.75 }, rpe: '7 - 7.5' },
      { name: 'Day 2 (Volume)', sets: 4, reps: 6, pct: 0.70, rpe: '6 - 7' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
    { week: '2: Progression', days: [
      { name: 'Day 1 (Single + Backoff)', sets: 1, reps: 1, pct: 0.85, backoff: { sets: 3, reps: 3, pct: 0.775 }, rpe: '8' },
      { name: 'Day 2 (Volume)', sets: 4, reps: 5, pct: 0.725, rpe: '7.5' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
    { week: '3: Overreach', days: [
      { name: 'Day 1 (Single + Backoff)', sets: 1, reps: 1, pct: 0.875, backoff: { sets: 3, reps: 2, pct: 0.80 }, rpe: '8.5 - 9' },
      { name: 'Day 2 (Volume)', sets: 4, reps: 4, pct: 0.75, rpe: '8' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
    { week: '4: Deload', days: [
      { name: 'Day 1 (Recovery Backoff)', sets: 3, reps: 3, pct: 0.60, rpe: '5' },
      { name: 'Day 2 (Recovery Volume)', sets: 2, reps: 5, pct: 0.60, rpe: '5' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
  ],
  peaking: [
    { week: '1: Volume Foundation', days: [
      { name: 'Day 1', sets: 5, reps: 5, pct: 0.75, rpe: '7 - 8' },
      { name: 'Day 2 (Heavy Triples)', sets: 3, reps: 3, pct: 0.85, rpe: '8' },
      { name: 'Day 3 (Singles)', sets: 4, reps: 1, pct: 0.90, rpe: '8.5' },
    ] },
    { week: '2: Push Volume', days: [
      { name: 'Day 1', sets: 4, reps: 5, pct: 0.80, rpe: '8 - 8.5' },
      { name: 'Day 2 (Heavy Triples)', sets: 3, reps: 3, pct: 0.90, rpe: '9' },
      { name: 'Day 3 (Singles)', sets: 3, reps: 1, pct: 0.95, rpe: '9' },
    ] },
    { week: '3: Peak Intensity', days: [
      { name: 'Day 1', sets: 3, reps: 5, pct: 0.85, rpe: '9' },
      { name: 'Day 2 (Heavy Triples)', sets: 3, reps: 3, pct: 0.925, rpe: '9.5' },
      { name: 'Day 3 (Singles)', sets: 2, reps: 1, pct: 0.975, rpe: '9.5' },
    ] },
    { week: '4: Test Week', days: [
      { name: 'Day 1', sets: 3, reps: 3, pct: 0.70, rpe: '6' },
      { name: 'Day 2', isRest: true },
      { name: 'Day 3 (TEST 1RM)', sets: 1, reps: 1, pct: 1.025, rpe: '10' },
    ] },
  ],
  pullup_double: [
    { week: '1: Baseline', days: [{ name: 'Day 1', sets: 3, reps: 3, pct: 0.825, rpe: '8' }, { name: 'Day 2', sets: 3, reps: 3, pct: 0.825, rpe: '8' }] },
    { week: '2: Progression', days: [{ name: 'Day 1', sets: 3, reps: 4, pct: 0.825, rpe: '8.5' }, { name: 'Day 2', sets: 3, reps: 4, pct: 0.825, rpe: '8.5' }] },
    { week: '3: Peak Volume', days: [{ name: 'Day 1', sets: 3, reps: 5, pct: 0.825, rpe: '9.5' }, { name: 'Day 2', sets: 3, reps: 5, pct: 0.825, rpe: '9.5' }] },
    { week: '4: Deload', days: [{ name: 'Day 1 (Speed)', sets: 3, reps: 3, pct: 0.70, rpe: '6' }, { name: 'Day 2 (Speed)', sets: 3, reps: 3, pct: 0.70, rpe: '6' }] },
  ],
  pullup_peak: [
    { week: '1: Phase A', days: [
      { name: 'Workout 1 (Volume Base)', sets: 3, reps: 5, pct: 0.80, rpe: '7.5' },
      { name: 'Workout 2 (Descending)', sets: 1, reps: 5, pct: 0.80, backoff: { sets: 1, reps: 3, pct: 0.85 }, backoff2: { sets: 1, reps: 2, pct: 0.90 }, rpe: '8.5' },
    ] },
    { week: '2: Phase B', days: [
      { name: 'Workout 3 (Heavy Triples)', sets: 3, reps: 3, pct: 0.875, rpe: '8.5' },
      { name: 'Workout 4 (Peak Descending)', sets: 1, reps: 3, pct: 0.85, backoff: { sets: 1, reps: 2, pct: 0.90 }, backoff2: { sets: 1, reps: 2, pct: 0.925 }, backoff3: { sets: 1, reps: 1, pct: 0.95 }, rpe: '9.5' },
    ] },
  ],
  pullup_fighter: [
    { week: '1: Ladder 1-5', days: [
      { name: 'Day 1', sets: 1, reps: '5, 4, 3, 2, 1', pct: 0.85, rpe: '8' },
      { name: 'Day 2', sets: 1, reps: '5, 4, 3, 2, 2', pct: 0.85, rpe: '8' },
      { name: 'Day 3', sets: 1, reps: '5, 4, 3, 3, 2', pct: 0.85, rpe: '8.5' },
      { name: 'Day 4', sets: 1, reps: '5, 4, 4, 3, 2', pct: 0.85, rpe: '8.5' },
      { name: 'Day 5', sets: 1, reps: '5, 5, 4, 3, 2', pct: 0.85, rpe: '9' },
      { name: 'Day 6 (Rest)', isRest: true },
    ] },
    { week: '2: Ladder 6-10', days: [
      { name: 'Day 1', sets: 1, reps: '5, 5, 4, 4, 2', pct: 0.85, rpe: '8.5' },
      { name: 'Day 2', sets: 1, reps: '5, 5, 5, 4, 2', pct: 0.85, rpe: '8.5' },
      { name: 'Day 3', sets: 1, reps: '5, 5, 5, 4, 3', pct: 0.85, rpe: '9' },
      { name: 'Day 4', sets: 1, reps: '5, 5, 5, 5, 3', pct: 0.85, rpe: '9' },
      { name: 'Day 5', sets: 1, reps: '5, 5, 5, 5, 4', pct: 0.85, rpe: '9.5' },
      { name: 'Day 6 (Rest)', isRest: true },
    ] },
    { week: '3: Ladder 11-15', days: [
      { name: 'Day 1', sets: 1, reps: '5, 5, 5, 5, 5', pct: 0.85, rpe: '10' },
      { name: 'Day 2 (Rest)', isRest: true },
    ] },
  ],
  rpe_3day: [
    { week: '1: Accumulation', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.89, pctRange: 0.02, backoff: { sets: 4, reps: 4, pct: 0.75, pctRange: 0.02 }, rpe: '7 (Top) / 6 (Back)' },
      { name: 'Day 2 (Triples)', sets: 4, reps: 3, pct: 0.79, pctRange: 0.02, rpe: '7' },
      { name: 'Day 3 (Volume)', sets: 4, reps: 6, pct: 0.73, pctRange: 0.02, rpe: '7' },
    ] },
    { week: '2: Development', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.92, pctRange: 0.02, backoff: { sets: 4, reps: 3, pct: 0.81, pctRange: 0.02 }, rpe: '8 (Top) / 7 (Back)' },
      { name: 'Day 2 (Triples)', sets: 4, reps: 3, pct: 0.82, pctRange: 0.02, rpe: '8' },
      { name: 'Day 3 (Volume)', sets: 4, reps: 5, pct: 0.77, pctRange: 0.02, rpe: '8' },
    ] },
    { week: '3: Peak Intensity', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.95, pctRange: 0.02, backoff: { sets: 3, reps: 3, pct: 0.84, pctRange: 0.02 }, rpe: '9 (Top) / 8 (Back)' },
      { name: 'Day 2 (Doubles)', sets: 3, reps: 2, pct: 0.87, pctRange: 0.02, rpe: '8.5' },
      { name: 'Day 3 (Volume)', sets: 3, reps: 4, pct: 0.81, pctRange: 0.02, rpe: '8.5' },
    ] },
    { week: '4: Deload', days: [
      { name: 'Day 1 (Deload)', sets: 3, reps: 3, pct: 0.73, pctRange: 0.02, rpe: '6' },
      { name: 'Day 2 (Deload)', sets: 2, reps: 3, pct: 0.70, pctRange: 0.02, rpe: '6' },
      { name: 'Day 3 (Deload)', sets: 2, reps: 5, pct: 0.65, pctRange: 0.02, rpe: '6' },
    ] },
  ],
  rpe_2day: [
    { week: '1: Accumulation', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.89, pctRange: 0.02, backoff: { sets: 4, reps: 4, pct: 0.75, pctRange: 0.02 }, rpe: '7 (Top) / 6 (Back)' },
      { name: 'Day 2 (Volume)', sets: 4, reps: 5, pct: 0.75, pctRange: 0.02, rpe: '7' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
    { week: '2: Development', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.92, pctRange: 0.02, backoff: { sets: 3, reps: 4, pct: 0.78, pctRange: 0.02 }, rpe: '8 (Top) / 7 (Back)' },
      { name: 'Day 2 (Volume)', sets: 4, reps: 4, pct: 0.80, pctRange: 0.02, rpe: '8' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
    { week: '3: Peak Intensity', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.95, pctRange: 0.02, backoff: { sets: 2, reps: 3, pct: 0.84, pctRange: 0.02 }, rpe: '9 (Top) / 8 (Back)' },
      { name: 'Day 2 (Triples)', sets: 3, reps: 3, pct: 0.85, pctRange: 0.02, rpe: '8.5' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
    { week: '4: Deload', days: [
      { name: 'Day 1 (Deload)', sets: 3, reps: 3, pct: 0.73, pctRange: 0.02, rpe: '6' },
      { name: 'Day 2 (Deload)', sets: 2, reps: 4, pct: 0.70, pctRange: 0.02, rpe: '6' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
  ],
  rpe_peaking: [
    { week: '1: Overload Intro', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.90, pctRange: 0.02, backoff: { sets: 3, reps: 3, pct: 0.80, pctRange: 0.02 }, rpe: '7.5 (Top) / 7.5 (Back)' },
      { name: 'Day 2 (Doubles)', sets: 3, reps: 2, pct: 0.84, pctRange: 0.02, rpe: '7.5' },
      { name: 'Day 3 (Fours)', sets: 3, reps: 4, pct: 0.78, pctRange: 0.02, rpe: '7' },
    ] },
    { week: '2: Overreach', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.94, pctRange: 0.02, backoff: { sets: 2, reps: 2, pct: 0.86, pctRange: 0.02 }, rpe: '8.5 (Top) / 8.5 (Back)' },
      { name: 'Day 2 (Singles)', sets: 3, reps: 1, pct: 0.89, pctRange: 0.02, rpe: '8' },
      { name: 'Day 3 (Triples)', sets: 2, reps: 3, pct: 0.82, pctRange: 0.02, rpe: '8' },
    ] },
    { week: '3: Tapering', days: [
      { name: 'Day 1 (Heavy Single)', sets: 1, reps: 1, pct: 0.97, pctRange: 0.02, backoff: { sets: 2, reps: 2, pct: 0.88, pctRange: 0.02 }, rpe: '9.5 (Top) / 8.5 (Back)' },
      { name: 'Day 2 (Light Doubles)', sets: 2, reps: 2, pct: 0.80, pctRange: 0.02, rpe: '7' },
      { name: 'Day 3 (Rest)', isRest: true },
    ] },
    { week: '4: Meet / Test Week', days: [
      { name: 'Day 1 (Openers)', sets: 3, reps: 1, pct: 0.85, pctRange: 0.02, rpe: '6' },
      { name: 'Day 2 (Rest)', isRest: true },
      { name: 'Day 3 (1RM MAX OUT)', sets: 1, reps: 1, pct: 1.02, pctRange: 0.02, rpe: '10' },
    ] },
  ],
};
