import { useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import { Modal, CloseButton } from '../common/Modal';
import { closeModal, saveCustomProgram } from '../../store/actions';
import { programsDict } from '../../lib/data';
import {
  pbKey, validateProgramDraft, validateSetup, scaffoldDraft, materializeDraft, inheritedDay, rpeFromPct, BUMP_STEPS,
} from '../../lib/programDraft';
import type { Draft, WeekDraft, DayDraft, SegDraft, SetupDraft, DraftError } from '../../lib/programDraft';
import type { CustomProgram, ProgramDay, ProgramSegment } from '../../lib/types';

// The builder edits a string-typed draft (controlled inputs), then converts to a
// CustomProgram on save: percentages are entered as whole numbers (80 → 0.80), day
// reps may be a number or a list string ("5, 3, 1"), backoff reps are numeric.

const newSeg = (): SegDraft => ({ sets: '3', reps: '5', pct: '70', pctRange: '' });
const newDay = (n: number): DayDraft => ({
  name: `Day ${n}`, isRest: false, sets: '3', reps: '5', pct: '75', pctRange: '', rpe: '', backoffs: [],
});
const newWeek = (n: number): WeekDraft => ({ week: String(n), days: [newDay(1)] });

const DEFAULT_SETUP: SetupDraft = { name: '', weeks: '4', daysPerWeek: '3', deload: true, assumeRpe: true };

const pctToWhole = (value?: number): string => (value != null ? String(Math.round(value * 1000) / 10) : '');

function toSegDraft(seg: ProgramSegment): SegDraft {
  return { sets: String(seg.sets ?? ''), reps: String(seg.reps ?? ''), pct: pctToWhole(seg.pct), pctRange: pctToWhole(seg.pctRange) };
}

function toDayDraft(day: ProgramDay): DayDraft {
  const backoffs: SegDraft[] = [];
  for (const seg of [day.backoff, day.backoff2, day.backoff3]) {
    if (seg) {
      backoffs.push(toSegDraft(seg));
    }
  }

  return {
    name: day.name || '',
    isRest: !!day.isRest,
    sets: day.sets != null ? String(day.sets) : '',
    reps: day.reps != null ? String(day.reps) : '',
    pct: pctToWhole(day.pct),
    pctRange: pctToWhole(day.pctRange),
    rpe: day.rpe || '',
    backoffs,
  };
}

function toDraft(program: CustomProgram): Draft {
  return {
    name: program.name,
    style: program.style,
    progressable: program.progressable,
    weeks: program.weeks.map((week) => ({ week: week.week, days: week.days.map(toDayDraft) })),
  };
}

const num = (value: string): number => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseReps = (value: string): number | string => {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : trimmed;
};

function toSegment(seg: SegDraft): ProgramSegment {
  const out: ProgramSegment = { sets: num(seg.sets), reps: num(seg.reps), pct: num(seg.pct) / 100 };
  if (seg.pctRange.trim() !== '' && num(seg.pctRange) > 0) {
    out.pctRange = num(seg.pctRange) / 100;
  }

  return out;
}

function toDay(day: DayDraft): ProgramDay {
  if (day.isRest) {
    return { name: day.name.trim() || 'Rest', isRest: true };
  }

  const out: ProgramDay = { name: day.name, sets: num(day.sets), reps: parseReps(day.reps), pct: num(day.pct) / 100 };
  if (day.pctRange.trim() !== '' && num(day.pctRange) > 0) {
    out.pctRange = num(day.pctRange) / 100;
  }
  if (day.rpe.trim() !== '') {
    out.rpe = day.rpe.trim();
  }

  const segs = day.backoffs.map(toSegment);
  if (segs[0]) { out.backoff = segs[0]; }
  if (segs[1]) { out.backoff2 = segs[1]; }
  if (segs[2]) { out.backoff3 = segs[2]; }

  return out;
}

function toCustomProgram(draft: Draft): CustomProgram {
  return {
    name: draft.name.trim(),
    style: draft.style,
    progressable: draft.progressable,
    weeks: draft.weeks.map((week) => ({ week: week.week, days: week.days.map(toDay) })),
  };
}

const autoRpe = (pctWhole: string): string => (pctWhole.trim() !== '' ? rpeFromPct(num(pctWhole) / 100) : '—');

export function ProgramBuilderModal({ editKey }: { editKey?: string }) {
  const state = useStore();
  const existing = editKey ? state.customPrograms?.[editKey] : undefined;
  const [step, setStep] = useState<'setup' | 'edit'>(editKey ? 'edit' : 'setup');
  const [setup, setSetup] = useState<SetupDraft>(DEFAULT_SETUP);
  const [draft, setDraft] = useState<Draft>(() => (existing ? toDraft(existing) : scaffoldDraft(DEFAULT_SETUP)));
  const [error, setError] = useState<DraftError | null>(null);

  const existingNames = useMemo(() => {
    const names = new Set(Object.values(programsDict).map((label) => label.toLowerCase()));
    for (const [key, program] of Object.entries(state.customPrograms || {})) {
      if (key !== editKey) {
        names.add(program.name.trim().toLowerCase());
      }
    }
    return names;
  }, [state.customPrograms, editKey]);

  const updateSetup = (patch: Partial<SetupDraft>) => {
    setError(null);
    setSetup((prev) => ({ ...prev, ...patch }));
  };

  const update = (mutate: (d: Draft) => void) => {
    setError(null);
    setDraft((prev) => {
      const next: Draft = JSON.parse(JSON.stringify(prev));
      mutate(next);
      return next;
    });
  };

  const flagError = (found: DraftError) => {
    setError(found);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-pbkey="${found.key}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }
    });
  };

  const submit = () => {
    if (step === 'setup') {
      const found = validateSetup(setup, existingNames);
      if (found) {
        flagError(found);
        return;
      }
      setDraft(scaffoldDraft(setup));
      setError(null);
      setStep('edit');
      return;
    }

    const found = validateProgramDraft(draft, existingNames);
    if (found) {
      flagError(found);
      return;
    }
    saveCustomProgram(toCustomProgram(materializeDraft(draft)), editKey);
  };

  const customizeDay = (wi: number, di: number) => update((d) => {
    const target = d.weeks[wi].days[di];
    const source = d.weeks[0]?.days[di];
    if (source) {
      const seed = inheritedDay(source, target.pctBump || 0, target.name);
      Object.assign(target, seed);
    }
    target.linked = false;
    target.pctBump = 0;
  });

  const relinkDay = (wi: number, di: number) => update((d) => {
    const target = d.weeks[wi].days[di];
    target.linked = true;
    target.pctBump = 0;
    target.sets = ''; target.reps = ''; target.pct = ''; target.pctRange = ''; target.rpe = '';
    target.backoffs = [];
  });

  const invalid = (key: string) => error?.key === key;
  const mark = (key: string) => ({ 'data-pbkey': key, 'aria-invalid': invalid(key) || undefined, className: invalid(key) ? 'pb-invalid' : undefined });

  const popup = error && (
    <div className="pb-suggestion" role="alert" key={error.key + '|' + error.message}>
      <strong>{step === 'setup' ? 'Check this first' : 'Can’t create this program yet'}</strong>
      <span>{error.message}</span>
    </div>
  );

  if (step === 'setup') {
    return (
      <Modal id="programBuilderModal" className="program-builder">
        <CloseButton onClick={() => closeModal()} />
        <h3>Create Program</h3>
        <p className="pb-setup-intro">Set up the shape of your block — you’ll just fill in the days next.</p>

        <div className="pb-setup">
          <div className="input-group">
            <label htmlFor="pbName">Program Name</label>
            <input
              type="text" id="pbName" style={{ width: '100%' }} value={setup.name}
              placeholder="e.g. My Squat Block" autoFocus
              onChange={(e) => updateSetup({ name: e.target.value })} {...mark(pbKey.name)}
            />
          </div>

          <div className="pb-setup-row">
            <label>Length (weeks)<input
              type="number" inputMode="numeric" value={setup.weeks}
              onChange={(e) => updateSetup({ weeks: e.target.value })} {...mark(pbKey.setupWeeks)}
            /></label>
            <label>Days per week<input
              type="number" inputMode="numeric" value={setup.daysPerWeek}
              onChange={(e) => updateSetup({ daysPerWeek: e.target.value })} {...mark(pbKey.setupDays)}
            /></label>
          </div>

          <label className="checkbox-item">
            <input type="checkbox" checked={setup.deload} onChange={(e) => updateSetup({ deload: e.target.checked })} />
            {' Include a deload week (last week, lighter)'}
          </label>
          <label className="checkbox-item">
            <input type="checkbox" checked={setup.assumeRpe} onChange={(e) => updateSetup({ assumeRpe: e.target.checked })} />
            {' Assume RPE — fill it in automatically from each %'}
          </label>
        </div>

        <button className="btn-progress" type="button" onClick={submit}>Continue →</button>
        {popup}
      </Modal>
    );
  }

  return (
    <Modal id="programBuilderModal" className="program-builder">
      <CloseButton onClick={() => closeModal()} />
      <h3>{editKey ? 'Edit Program' : 'Create Program'}</h3>
      {!editKey && (
        <button type="button" className="pb-back" onClick={() => { setError(null); setStep('setup'); }}>
          ← Change template (resets the days)
        </button>
      )}

      <div className="input-group" style={{ marginBottom: 12 }}>
        <label htmlFor="pbName">Program Name</label>
        <input
          type="text" id="pbName" style={{ width: '100%' }} value={draft.name}
          placeholder="e.g. My Squat Block"
          onChange={(e) => update((d) => { d.name = e.target.value; })} {...mark(pbKey.name)}
        />
      </div>

      <div className="pb-flags">
        <label className="checkbox-item">
          <input
            type="checkbox" checked={draft.style === 'build'}
            onChange={(e) => update((d) => { d.style = e.target.checked ? 'build' : 'peak'; })}
          />
          {' Build style (green header) — uncheck for peak (red)'}
        </label>
        <label className="checkbox-item">
          <input
            type="checkbox" checked={draft.progressable}
            onChange={(e) => update((d) => { d.progressable = e.target.checked; })}
          />
          {' Show “Complete Block & Recalculate” button'}
        </label>
        <label className="checkbox-item">
          <input
            type="checkbox" checked={!!draft.assumeRpe}
            onChange={(e) => update((d) => { d.assumeRpe = e.target.checked; })}
          />
          {' Assume RPE — auto from each %'}
        </label>
      </div>

      <div className="pb-weeks">
        {draft.weeks.map((week, wi) => (
          <div className={'pb-week' + (week.isDeload ? ' pb-week--deload' : '')} key={wi}>
            <div className="pb-week-head">
              <input
                type="text" value={week.week}
                aria-label={`Week ${wi + 1} label`}
                onChange={(e) => update((d) => { d.weeks[wi].week = e.target.value; })}
                data-pbkey={pbKey.week(wi)} aria-invalid={invalid(pbKey.week(wi)) || undefined}
                className={'pb-week-name' + (invalid(pbKey.week(wi)) ? ' pb-invalid' : '')}
              />
              {week.isDeload && <span className="pb-deload-badge">Deload</span>}
              {draft.weeks.length > 1 && (
                <button
                  type="button" className="pb-remove" title="Remove week" aria-label="Remove week"
                  onClick={() => update((d) => { d.weeks.splice(wi, 1); })}
                >×</button>
              )}
            </div>

            {week.days.map((day, di) => {
              const isGhost = wi > 0 && day.linked && !week.isDeload;
              const source = isGhost ? draft.weeks[0]?.days[di] : undefined;
              const effective = source ? inheritedDay(source, day.pctBump || 0, day.name) : undefined;

              return (
                <div className="pb-day" key={di}>
                  <div className="pb-day-head">
                    <input
                      type="text" value={day.name} aria-label="Day name"
                      onChange={(e) => update((d) => { d.weeks[wi].days[di].name = e.target.value; })}
                      data-pbkey={pbKey.dayName(wi, di)} aria-invalid={invalid(pbKey.dayName(wi, di)) || undefined}
                      className={'pb-day-name' + (invalid(pbKey.dayName(wi, di)) ? ' pb-invalid' : '')}
                    />
                    {!isGhost && (
                      <label className="pb-rest">
                        <input
                          type="checkbox" checked={day.isRest}
                          onChange={(e) => update((d) => { d.weeks[wi].days[di].isRest = e.target.checked; })}
                          {...mark(pbKey.dayRest(wi, di))}
                        />
                        Rest
                      </label>
                    )}
                    {week.days.length > 1 && (
                      <button
                        type="button" className="pb-remove" title="Remove day" aria-label="Remove day"
                        onClick={() => update((d) => { d.weeks[wi].days.splice(di, 1); })}
                      >×</button>
                    )}
                  </div>

                  {isGhost ? (
                    <div
                      className={'pb-ghost' + (invalid(pbKey.dayPct(wi, di)) ? ' pb-invalid' : '')}
                      data-pbkey={pbKey.dayPct(wi, di)} aria-invalid={invalid(pbKey.dayPct(wi, di)) || undefined}
                    >
                      {effective ? (
                        <>
                          <span className="pb-ghost-text">
                            Mirrors Week 1 · {effective.sets} × {effective.reps} @ {effective.pct}%
                            {draft.assumeRpe ? ` (RPE ${autoRpe(effective.pct)})` : effective.rpe ? ` (RPE ${effective.rpe})` : ''}
                          </span>
                          <div className="pb-bump">
                            {BUMP_STEPS.map((stepPct) => (
                              <button
                                key={stepPct} type="button" className="pb-bump-btn"
                                onClick={() => update((d) => { const t = d.weeks[wi].days[di]; t.pctBump = (t.pctBump || 0) + stepPct; })}
                              >+{stepPct}%</button>
                            ))}
                            {(day.pctBump || 0) > 0 && <span className="pb-bump-chip">+{day.pctBump}%</span>}
                            {(day.pctBump || 0) > 0 && (
                              <button type="button" className="pb-add-inline" onClick={() => update((d) => { d.weeks[wi].days[di].pctBump = 0; })}>Reset</button>
                            )}
                            <button type="button" className="pb-add-inline" onClick={() => customizeDay(wi, di)}>Customize</button>
                          </div>
                        </>
                      ) : (
                        <span className="pb-ghost-text">Add Day {di + 1} to Week 1 and it’ll appear here, or Customize this day.
                          {' '}<button type="button" className="pb-add-inline" onClick={() => customizeDay(wi, di)}>Customize</button>
                        </span>
                      )}
                    </div>
                  ) : !day.isRest ? (
                    <>
                      <div className="pb-fields">
                        <label>Sets<input
                          type="number" inputMode="numeric" value={day.sets}
                          onChange={(e) => update((d) => { d.weeks[wi].days[di].sets = e.target.value; })}
                          {...mark(pbKey.daySets(wi, di))}
                        /></label>
                        <label className="pb-reps">Reps<input
                          type="text" value={day.reps}
                          onChange={(e) => update((d) => { d.weeks[wi].days[di].reps = e.target.value; })}
                          {...mark(pbKey.dayReps(wi, di))}
                        /></label>
                        <label>%<input
                          type="number" inputMode="decimal" value={day.pct}
                          onChange={(e) => update((d) => { d.weeks[wi].days[di].pct = e.target.value; })}
                          {...mark(pbKey.dayPct(wi, di))}
                        /></label>
                        <label>±%<input
                          type="number" inputMode="decimal" value={day.pctRange}
                          onChange={(e) => update((d) => { d.weeks[wi].days[di].pctRange = e.target.value; })}
                          {...mark(pbKey.dayRange(wi, di))}
                        /></label>
                        {draft.assumeRpe ? (
                          <span className="pb-auto-rpe">RPE {autoRpe(day.pct)}<small>auto</small></span>
                        ) : (
                          <label className="pb-rpe">RPE<input
                            type="text" value={day.rpe}
                            onChange={(e) => update((d) => { d.weeks[wi].days[di].rpe = e.target.value; })}
                            {...mark(pbKey.dayRpe(wi, di))}
                          /></label>
                        )}
                      </div>

                      {day.backoffs.map((seg, si) => (
                        <div className="pb-seg" key={si}>
                          <span className="pb-seg-label">Backoff {si + 1}</span>
                          <label>Sets<input
                            type="number" value={seg.sets}
                            onChange={(e) => update((d) => { d.weeks[wi].days[di].backoffs[si].sets = e.target.value; })}
                            {...mark(pbKey.segSets(wi, di, si))}
                          /></label>
                          <label>Reps<input
                            type="number" value={seg.reps}
                            onChange={(e) => update((d) => { d.weeks[wi].days[di].backoffs[si].reps = e.target.value; })}
                            {...mark(pbKey.segReps(wi, di, si))}
                          /></label>
                          <label>%<input
                            type="number" value={seg.pct}
                            onChange={(e) => update((d) => { d.weeks[wi].days[di].backoffs[si].pct = e.target.value; })}
                            {...mark(pbKey.segPct(wi, di, si))}
                          /></label>
                          <label>±%<input
                            type="number" value={seg.pctRange}
                            onChange={(e) => update((d) => { d.weeks[wi].days[di].backoffs[si].pctRange = e.target.value; })}
                            {...mark(pbKey.segRange(wi, di, si))}
                          /></label>
                          <button
                            type="button" className="pb-remove" title="Remove backoff" aria-label="Remove backoff"
                            onClick={() => update((d) => { d.weeks[wi].days[di].backoffs.splice(si, 1); })}
                          >×</button>
                        </div>
                      ))}
                      <div className="pb-day-actions">
                        {day.backoffs.length < 3 && (
                          <button
                            type="button" className="pb-add-inline"
                            onClick={() => update((d) => { d.weeks[wi].days[di].backoffs.push(newSeg()); })}
                          >+ Add backoff</button>
                        )}
                        {wi > 0 && !week.isDeload && !day.linked && (
                          <button type="button" className="pb-add-inline" onClick={() => relinkDay(wi, di)}>Re-link to Week 1</button>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}

            <button
              type="button" className="pb-add-inline"
              onClick={() => update((d) => { d.weeks[wi].days.push(newDay(d.weeks[wi].days.length + 1)); })}
            >+ Add day</button>
          </div>
        ))}
      </div>

      <button
        type="button" className="pb-add-week"
        onClick={() => update((d) => { d.weeks.push(newWeek(d.weeks.length + 1)); })}
      >+ Add week</button>

      <button className="btn-progress" type="button" onClick={submit}>
        {editKey ? 'Save Changes' : 'Create Program'}
      </button>

      {popup}
    </Modal>
  );
}
