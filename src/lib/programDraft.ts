// String-typed draft of a custom program, shared by ProgramBuilderModal and its
// validator. The builder edits these strings; saveCustomProgram converts them to a
// CustomProgram. validateProgramDraft walks the draft in reading order and returns the
// first problem so the modal can highlight that one field and explain how to fix it.

export interface SegDraft { sets: string; reps: string; pct: string; pctRange: string; }
export interface DayDraft {
  name: string; isRest: boolean;
  sets: string; reps: string; pct: string; pctRange: string; rpe: string;
  backoffs: SegDraft[];
  // Weeks after the first (except deload) start "linked": the day mirrors Week 1's day at the
  // same index, with pctBump percentage points added to its loads. Editing the day unlinks it.
  linked?: boolean;
  pctBump?: number;
}
export interface WeekDraft { week: string; days: DayDraft[]; isDeload?: boolean; }
export interface Draft {
  name: string; style: 'build' | 'peak'; progressable: boolean; weeks: WeekDraft[];
  // When on, RPE is derived from each set's % instead of being typed per day.
  assumeRpe?: boolean;
}

// The tiny template the user fills before the editor scaffolds the program (number fields are
// string-typed like the rest of the draft, since they come straight from controlled inputs).
export interface SetupDraft { name: string; weeks: string; daysPerWeek: string; deload: boolean; assumeRpe: boolean; }

export interface DraftError { key: string; message: string; }

const MAX_SETS = 20;
const MAX_REPS = 100;
const MIN_PCT = 1;
const MAX_PCT = 150;
const MIN_RANGE = 0.1;
const MAX_RANGE = 50;
const RPE_MIN = 1;
const RPE_MAX = 10;

export const MAX_WEEKS = 16;
export const MAX_DAYS_PER_WEEK = 7;
export const BUMP_STEPS = [2.5, 5];

const WEEK1_SETS = 3;
const WEEK1_REPS = 5;
const WEEK1_PCT = 70;
const DELOAD_SETS = 3;
const DELOAD_REPS = 5;
const DELOAD_PCT = 60;

// % of 1RM (as a fraction) → a sensible RPE, used by the "assume RPE" option.
export function rpeFromPct(pct: number): string {
  if (pct >= 0.85) {
    return '9';
  }
  if (pct >= 0.80) {
    return '8';
  }
  if (pct >= 0.75) {
    return '7.5';
  }
  if (pct >= 0.70) {
    return '7';
  }
  return '6';
}

// Stable keys identifying every editable field, so the validator and the JSX tag inputs
// with the exact same string (data-pbkey) and the modal can focus the offending one.
export const pbKey = {
  name: 'name',
  setupWeeks: 'setup:weeks',
  setupDays: 'setup:days',
  week: (wi: number) => `week:${wi}`,
  dayName: (wi: number, di: number) => `day:${wi}:${di}:name`,
  dayRest: (wi: number, di: number) => `day:${wi}:${di}:rest`,
  daySets: (wi: number, di: number) => `day:${wi}:${di}:sets`,
  dayReps: (wi: number, di: number) => `day:${wi}:${di}:reps`,
  dayPct: (wi: number, di: number) => `day:${wi}:${di}:pct`,
  dayRange: (wi: number, di: number) => `day:${wi}:${di}:range`,
  dayRpe: (wi: number, di: number) => `day:${wi}:${di}:rpe`,
  segSets: (wi: number, di: number, si: number) => `seg:${wi}:${di}:${si}:sets`,
  segReps: (wi: number, di: number, si: number) => `seg:${wi}:${di}:${si}:reps`,
  segPct: (wi: number, di: number, si: number) => `seg:${wi}:${di}:${si}:pct`,
  segRange: (wi: number, di: number, si: number) => `seg:${wi}:${di}:${si}:range`,
};

const intInRange = (raw: string, min: number, max: number): boolean => {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return false;
  }
  const value = Number(trimmed);
  return value >= min && value <= max;
};

const numInRange = (raw: string, min: number, max: number): boolean => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return false;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= min && value <= max;
};

const repsListOk = (raw: string): boolean => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return false;
  }
  return trimmed.split(',').every((part) => intInRange(part, 1, MAX_REPS));
};

const rpeOk = (raw: string): boolean => {
  const trimmed = raw.trim();
  if (!/^[0-9.\s/-]+$/.test(trimmed)) {
    return false;
  }
  const parts = trimmed.split(/[\s/-]+/).filter(Boolean);
  return parts.length > 0 && parts.every((part) => numInRange(part, RPE_MIN, RPE_MAX));
};

// pctRange is the optional spread around pct; a spread at or above pct would push the low
// end to zero, so it must be a small positive number strictly below the percentage.
const rangeOk = (rawRange: string, rawPct: string): boolean =>
  numInRange(rawRange, MIN_RANGE, MAX_RANGE) && Number(rawRange.trim()) < Number(rawPct.trim());

const toNum = (value: string): number => {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInt = (value: string): number => {
  const parsed = parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

// A later week's day that mirrors a Week 1 day, with pctBump percentage points added to its
// loads (the day's own pct and every backoff's pct). The caller supplies the day name so each
// week can label its days independently while still inheriting the numbers.
export function inheritedDay(source: DayDraft, pctBump: number, name: string): DayDraft {
  const bumped = (pctStr: string): string => {
    const value = toNum(pctStr);
    return value > 0 ? String(Math.round((value + pctBump) * 10) / 10) : pctStr;
  };

  return {
    name,
    isRest: source.isRest,
    sets: source.sets,
    reps: source.reps,
    pct: bumped(source.pct),
    pctRange: source.pctRange,
    rpe: source.rpe,
    backoffs: source.backoffs.map((seg) => ({ ...seg, pct: bumped(seg.pct) })),
  };
}

export function scaffoldDraft(setup: SetupDraft): Draft {
  const weekCount = clamp(toInt(setup.weeks), 1, MAX_WEEKS);
  const daysPerWeek = clamp(toInt(setup.daysPerWeek), 1, MAX_DAYS_PER_WEEK);
  const weeks: WeekDraft[] = [];

  for (let w = 1; w <= weekCount; w++) {
    const isDeload = setup.deload && weekCount > 1 && w === weekCount;
    const days: DayDraft[] = [];

    for (let d = 1; d <= daysPerWeek; d++) {
      const name = `Day ${d}`;
      if (w === 1) {
        days.push({ name, isRest: false, sets: String(WEEK1_SETS), reps: String(WEEK1_REPS), pct: String(WEEK1_PCT), pctRange: '', rpe: '', backoffs: [] });
      } else if (isDeload) {
        days.push({ name, isRest: false, sets: String(DELOAD_SETS), reps: String(DELOAD_REPS), pct: String(DELOAD_PCT), pctRange: '', rpe: '', backoffs: [] });
      } else {
        days.push({ name, isRest: false, sets: '', reps: '', pct: '', pctRange: '', rpe: '', backoffs: [], linked: true, pctBump: 0 });
      }
    }

    weeks.push({ week: isDeload ? 'Deload' : String(w), days, isDeload });
  }

  return { name: setup.name.trim(), style: 'build', progressable: true, assumeRpe: setup.assumeRpe, weeks };
}

// Resolve a draft to plain concrete days for saving/validation: linked days become their
// inherited Week 1 values, and (when assumeRpe) every training day's RPE is filled from its %.
export function materializeDraft(draft: Draft): Draft {
  const week1 = draft.weeks[0];
  const weeks = draft.weeks.map((week, wi) => ({
    week: week.week,
    isDeload: week.isDeload,
    days: week.days.map((day, di) => {
      const source = wi > 0 && day.linked ? week1?.days[di] : undefined;
      const base = source ? inheritedDay(source, day.pctBump || 0, day.name) : { ...day, backoffs: day.backoffs.map((seg) => ({ ...seg })) };
      if (draft.assumeRpe && !base.isRest) {
        base.rpe = rpeFromPct(toNum(base.pct) / 100);
      }
      return { ...base, linked: false, pctBump: 0 };
    }),
  }));

  return { ...draft, weeks };
}

export function validateSetup(setup: SetupDraft, existingNames: Set<string>): DraftError | null {
  const name = setup.name.trim();
  if (name === '') {
    return { key: pbKey.name, message: 'Give your program a name so you can pick it later — for example “My Squat Block”.' };
  }
  if (existingNames.has(name.toLowerCase())) {
    return { key: pbKey.name, message: 'A program with this name already exists. Choose a different name so you can tell them apart.' };
  }
  if (!intInRange(setup.weeks, 1, MAX_WEEKS)) {
    return { key: pbKey.setupWeeks, message: `How many weeks is the block? Enter a whole number from 1 to ${MAX_WEEKS}.` };
  }
  if (!intInRange(setup.daysPerWeek, 1, MAX_DAYS_PER_WEEK)) {
    return { key: pbKey.setupDays, message: `How many training days each week? Enter a whole number from 1 to ${MAX_DAYS_PER_WEEK}.` };
  }

  return null;
}

export function validateProgramDraft(draft: Draft, existingNames: Set<string>): DraftError | null {
  const name = draft.name.trim();
  if (name === '') {
    return { key: pbKey.name, message: 'Give your program a name so you can pick it later — for example “My Squat Block”.' };
  }
  if (existingNames.has(name.toLowerCase())) {
    return { key: pbKey.name, message: 'A program with this name already exists. Choose a different name so you can tell them apart.' };
  }

  const hasTrainingDay = draft.weeks.some((week) => week.days.some((day) => !day.isRest));
  if (!hasTrainingDay) {
    return { key: pbKey.dayRest(0, 0), message: 'A program needs at least one training day. Uncheck “Rest” on a day, then fill in its sets, reps and %.' };
  }

  for (let wi = 0; wi < draft.weeks.length; wi++) {
    const week = draft.weeks[wi];
    if (week.week.trim() === '') {
      return { key: pbKey.week(wi), message: 'Give this week a label — it becomes the section heading. Try “1” or “Week 1: Volume”.' };
    }

    for (let di = 0; di < week.days.length; di++) {
      const day = week.days[di];
      if (day.name.trim() === '') {
        return { key: pbKey.dayName(wi, di), message: 'Name this day, e.g. “Day 1 (Volume)”, or tick “Rest” if no lifting happens.' };
      }
      if (day.isRest) {
        continue;
      }
      if (wi > 0 && day.linked && !week.isDeload) {
        const source = draft.weeks[0]?.days[di];
        if (source) {
          const effective = toNum(source.pct) + (day.pctBump || 0);
          if (effective < MIN_PCT || effective > MAX_PCT) {
            return { key: pbKey.dayPct(wi, di), message: `This day mirrors Week 1 (${toNum(source.pct)}%) plus your bump — keep the result between ${MIN_PCT} and ${MAX_PCT}%, or lower the bump.` };
          }
          continue;
        }
      }
      if (!intInRange(day.sets, 1, MAX_SETS)) {
        return { key: pbKey.daySets(wi, di), message: `Sets must be a whole number from 1 to ${MAX_SETS} — how many working sets, e.g. 3.` };
      }
      if (!repsListOk(day.reps)) {
        return { key: pbKey.dayReps(wi, di), message: 'Reps can be one number like 5, or a comma-separated list like “5, 3, 1” when each set differs.' };
      }
      if (!numInRange(day.pct, MIN_PCT, MAX_PCT)) {
        return { key: pbKey.dayPct(wi, di), message: `% is the share of your 1RM as a whole number from ${MIN_PCT} to ${MAX_PCT} — enter 75 for 75%, not 0.75.` };
      }
      if (day.pctRange.trim() !== '' && !rangeOk(day.pctRange, day.pct)) {
        return { key: pbKey.dayRange(wi, di), message: 'Leave ±% blank, or enter a small spread smaller than the % above — e.g. 5 turns 75% into a 70–80% range.' };
      }
      if (!draft.assumeRpe && day.rpe.trim() !== '' && !rpeOk(day.rpe)) {
        return { key: pbKey.dayRpe(wi, di), message: `RPE is optional — use ${RPE_MIN}–${RPE_MAX} (e.g. 8) or a range (e.g. “7 - 8”), or leave it blank.` };
      }

      for (let si = 0; si < day.backoffs.length; si++) {
        const seg = day.backoffs[si];
        const label = si + 1;
        if (!intInRange(seg.sets, 1, MAX_SETS)) {
          return { key: pbKey.segSets(wi, di, si), message: `Backoff ${label} sets must be a whole number from 1 to ${MAX_SETS}. Remove the backoff if you don’t need it.` };
        }
        if (!intInRange(seg.reps, 1, MAX_REPS)) {
          return { key: pbKey.segReps(wi, di, si), message: `Backoff ${label} reps must be a whole number, e.g. 4.` };
        }
        if (!numInRange(seg.pct, MIN_PCT, MAX_PCT)) {
          return { key: pbKey.segPct(wi, di, si), message: `Backoff ${label} % must be a whole number from ${MIN_PCT} to ${MAX_PCT} of your 1RM, e.g. 70.` };
        }
        if (seg.pctRange.trim() !== '' && !rangeOk(seg.pctRange, seg.pct)) {
          return { key: pbKey.segRange(wi, di, si), message: `Backoff ${label} ±% is optional — leave it blank or enter a small spread smaller than its %.` };
        }
      }
    }
  }

  return null;
}
