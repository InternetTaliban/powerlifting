import { useState } from 'react';
import { useStore } from '../../store/store';
import { Modal, CloseButton } from '../common/Modal';
import { closeModal, saveLogWorkout } from '../../store/actions';
import { programs } from '../../lib/data';
import { formatDate } from '../../util/date';
import { buildProgramRow } from '../program/ProgramRow';

interface Props { context?: 'planner' | 'backlog'; date?: string; markDone?: boolean; }

export function LogWorkoutModal({ context = 'planner', date, markDone }: Props) {
  const state = useStore();
  const exercises = state.exercises;
  const firstEx = state.activeLift && exercises.includes(state.activeLift) ? state.activeLift : exercises[0];

  const [ex, setEx] = useState(firstEx);
  const [maxStr, setMaxStr] = useState(String(state.lifts[firstEx]?.max ?? ''));
  const [w, setW] = useState(0);
  const [d, setD] = useState(0);
  const [dateStr, setDateStr] = useState(date || formatDate(new Date()));
  const [done, setDone] = useState(markDone != null ? markDone : context === 'backlog');

  const prog = state.lifts[ex]?.program;
  const weeks = prog ? programs[prog] || [] : [];
  const weekData = weeks[w];
  const trainingDays = (weekData?.days || []).map((day, idx) => ({ day, idx })).filter(({ day }) => !day.isRest);

  const onExChange = (next: string) => {
    setEx(next);
    setMaxStr(String(state.lifts[next]?.max ?? ''));
    setW(0);
    setD(0);
  };
  const onWeekChange = (nextW: number) => {
    setW(nextW);
    setD(0);
  };

  const previewRow = prog && !isNaN(w) && !isNaN(d)
    ? buildProgramRow(ex, prog, w, d, { prefixExercise: true, maxOverride: maxStr, interactive: false })
    : null;

  return (
    <Modal id="logWorkoutModal">
      <CloseButton onClick={() => closeModal()} />
      <h3 id="lwTitle">{context === 'backlog' ? 'Backlog a Workout' : 'Log a Workout'}</h3>
      <div className="lw-grid">
        <div className="input-group">
          <label htmlFor="lwExercise">Exercise</label>
          <select id="lwExercise" value={ex} onChange={(e) => onExChange(e.target.value)}>
            {exercises.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="lwMax">1 Rep Max</label>
          <input
            type="number"
            id="lwMax"
            step="0.5"
            min="0"
            inputMode="decimal"
            value={maxStr}
            onChange={(e) => setMaxStr(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="lwWeek">Week</label>
          <select id="lwWeek" value={w} onChange={(e) => onWeekChange(parseInt(e.target.value, 10))}>
            {weeks.map((wk, i) => <option key={i} value={i}>{wk.week ? `Week ${wk.week}` : `Week ${i + 1}`}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="lwDay">Day</label>
          <select id="lwDay" value={d} onChange={(e) => setD(parseInt(e.target.value, 10))}>
            {trainingDays.length === 0
              ? <option value="">No training days this week</option>
              : trainingDays.map(({ day, idx }) => (
                  <option key={idx} value={idx}>
                    {day.name ? day.name.split('(')[0].trim() : `Day ${idx + 1}`}
                  </option>
                ))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="lwDate">Date</label>
          <input type="date" id="lwDate" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        </div>
        <div className="input-group lw-done-group">
          <input type="checkbox" id="lwDone" checked={done} onChange={(e) => setDone(e.target.checked)} />
          <label htmlFor="lwDone">Mark as completed</label>
        </div>
      </div>
      <div id="lwPreview" className="lw-preview" aria-live="polite">
        {previewRow
          ? (
            <table className="lw-preview-table">
              <thead>
                <tr><th>Workout</th><th>Sets/Reps</th><th>Load</th><th>RPE</th></tr>
              </thead>
              <tbody>{previewRow}</tbody>
            </table>
          )
          : <p className="split-empty-note">That day is a rest day — pick a training day.</p>}
      </div>
      <button
        className="btn-progress"
        type="button"
        onClick={() => saveLogWorkout({ ex, week: w, day: d, max: parseFloat(maxStr), date: dateStr, markDone: done })}
      >
        Save Workout
      </button>
    </Modal>
  );
}
