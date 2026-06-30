import { useState } from 'react';
import { useStore } from '../../store/store';
import { Modal, CloseButton } from '../common/Modal';
import { closeModal, openModal, goToProgramRow, toggleRowComplete } from '../../store/actions';
import { weekDays, programs } from '../../lib/data';
import { formatDate, formatDisplayDate } from '../../util/date';
import { parseRowId } from '../../lib/rowId';
import { makeRowId } from '../../lib/calc';
import { ensureMasterSplit, hasAnyMasterSplit } from '../../lib/masterSplit';
import { buildProgramRow } from '../program/ProgramRow';
import { Icon } from '../Icon';
import type { ReactNode } from 'react';

export function TodayModal() {
  const state = useStore();
  ensureMasterSplit();
  const [offset, setOffset] = useState(0);
  const [splitWeek, setSplitWeek] = useState<number | null>(null);

  const viewDate = new Date();
  viewDate.setDate(viewDate.getDate() + offset);
  const wd = (viewDate.getDay() + 6) % 7;
  const dateStr = formatDate(viewDate);
  const dateLabel = `${weekDays[wd]}, ${formatDisplayDate(viewDate)}`;
  const relLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : weekDays[wd];

  const goPrevDay = () => {
    setOffset((o) => o - 1);
    setSplitWeek(null);
  };
  const goNextDay = () => {
    setOffset((o) => o + 1);
    setSplitWeek(null);
  };
  const goToday = () => {
    setOffset(0);
    setSplitWeek(null);
  };

  const body = renderBody();

  return (
    <Modal id="todayModal" className="today-modal">
      <CloseButton onClick={() => closeModal()} />
      <h3>Today's Workout</h3>
      <div className="today-date-nav">
        <button className="icon-btn" type="button" onClick={goPrevDay} aria-label="Previous day">
          <Icon id="icon-chevron-left" size={22} />
        </button>
        <button
          type="button"
          className={'today-date-label' + (offset !== 0 ? ' away' : '')}
          disabled={offset === 0}
          title={offset === 0 ? '' : 'Jump back to today'}
          onClick={goToday}
        >
          {relLabel} · {formatDisplayDate(viewDate)}
        </button>
        <button className="icon-btn" type="button" onClick={goNextDay} aria-label="Next day">
          <Icon id="icon-chevron-right" size={22} />
        </button>
      </div>
      <div id="todayModalBody">{body}</div>
    </Modal>
  );

  function table(rows: ReactNode[], subtitle: string, extraHeader?: ReactNode): ReactNode {
    const headerLabel = relLabel === weekDays[wd]
      ? `${weekDays[wd]} · ${formatDisplayDate(viewDate)}`
      : `${relLabel} · ${weekDays[wd]}`;
    return (
      <>
        <p className="today-subtitle">{subtitle}</p>
        <article className="week-card">
          <header className="week-header theme-build">
            <span className="week-title">{headerLabel}</span>
            {extraHeader}
          </header>
          <table>
            <thead><tr>
              <th style={{ width: '32%' }}>Workout</th>
              <th style={{ width: '24%' }}>Sets/Reps</th>
              <th style={{ width: '24%' }}>Load</th>
              <th style={{ width: '20%' }}>RPE <button
                className="info-icon"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeModal();
                }}
                aria-label="RPE guide"
              >i</button></th>
            </tr></thead>
            <tbody>{rows}</tbody>
          </table>
        </article>
      </>
    );
  }

  function empty(title: string, message: string, extra?: ReactNode): ReactNode {
    return (
      <>
        <div className="today-empty">
          <p className="today-empty-title">{title}</p>
          <p className="split-empty-note">{message}</p>
        </div>
        {extra}
      </>
    );
  }

  function customRow(id: string, name: string, note: string): ReactNode {
    const done = !!state.completed[id];
    return (
      <tr
        key={id}
        className={done ? 'completed' : undefined}
        role="button" tabIndex={0}
        aria-pressed={done ? 'true' : 'false'}
        onClick={() => toggleRowComplete(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleRowComplete(id);
          }
        }}
      >
        <td>CUSTOM · {name}</td>
        <td className={note ? undefined : 'sub-text'}>{note || '—'}</td>
        <td className="weight-cell sub-text">—</td>
        <td className="rpe-cell sub-text">—</td>
      </tr>
    );
  }

  function plannerRow(rowId: string): { lift: string; node: ReactNode } | null {
    const p = parseRowId(rowId);
    if (p) {
      const node = buildProgramRow(p.ex, p.program, p.week, p.day, {
        prefixExercise: true,
        block: p.block,
        goto: () => goToProgramRow(rowId, p.ex),
      });
      return node ? { lift: p.ex, node } : null;
    }
    const def = state.customWorkouts?.[rowId];
    if (!def) {
      return null;
    }
    return { lift: def.name, node: customRow(rowId, def.name, def.note) };
  }

  function renderBody(): ReactNode {
    const plannerIds = Object.keys(state.calendar || {}).filter((id) => state.calendar[id] === dateStr);
    if (plannerIds.length > 0) {
      const rows: { lift: string; node: ReactNode }[] = [];
      for (const rowId of plannerIds) {
        const row = plannerRow(rowId);
        if (row) {
          rows.push(row);
        }
      }
      rows.sort((a, b) => a.lift.localeCompare(b.lift));
      if (rows.length > 0) {
        return table(rows.map((r) => r.node), `${dateLabel} · from your Weekly Planner`);
      }
    }

    if (offset < 0) {
      return empty(
        'Rest day',
        `${dateLabel} is in the past, so it’s a rest day by default. Did you train? Use “Backlog a workout” to record it.`,
        <button
          type="button"
          className="cycle-btn today-backlog-btn"
          onClick={() => openModal('logWorkout', { date: dateStr, markDone: true, context: 'backlog' })}
        >
          Backlog a workout
        </button>,
      );
    }

    if (!hasAnyMasterSplit()) {
      return empty(
        'No workout to load',
        'You don’t have a Master Split set up and nothing is planned for today in the Weekly Planner. Build a split in Master Split, or plan workouts in the Weekly Planner, then try again.',
      );
    }

    const slots = state.masterSplit?.[wd] || [];
    if (slots.length === 0) {
      return empty(
        'Rest day',
        `${dateLabel} — your Master Split has no workouts scheduled for ${weekDays[wd]}. Enjoy the recovery.`,
      );
    }

    if (splitWeek === null) {
      let maxWeeks = 0;
      for (const s of slots) {
        const prog = state.lifts[s.ex]?.program;
        const len = (programs[prog] || []).length;
        if (len > maxWeeks) {
          maxWeeks = len;
        }
      }
      if (maxWeeks === 0) {
        return empty(
          'Nothing to show',
          'The exercises in today’s split don’t have a valid program. Check each lift’s program in the main view.',
        );
      }
      return (
        <div className="today-week-picker">
          <p className="today-subtitle">
            {weekDays[wd]}, {formatDisplayDate(viewDate)} has nothing in your Weekly Planner, so this
            comes from your Master Split — which program week are you on?
          </p>
          <div className="today-week-buttons">
            {Array.from({ length: maxWeeks }, (_, wk) => (
              <button key={wk} type="button" className="cycle-btn" onClick={() => setSplitWeek(wk)}>
                Week {wk + 1}
              </button>
            ))}
          </div>
        </div>
      );
    }

    const rows: ReactNode[] = [];
    for (const s of slots) {
      const prog = state.lifts[s.ex]?.program;
      if (!prog) {
        continue;
      }
      const rowId = makeRowId(s.ex, prog, splitWeek, s.d, state.lifts[s.ex].block || 0);
      const node = buildProgramRow(s.ex, prog, splitWeek, s.d, {
        prefixExercise: true,
        goto: () => goToProgramRow(rowId, s.ex),
      });
      if (node) {
        rows.push(node);
      }
    }
    if (rows.length === 0) {
      return empty(
        'Rest in this week',
        `Every lift scheduled for ${weekDays[wd]} is a rest day in Week ${splitWeek + 1}. Pick a different week if that isn’t right.`,
        <button
          type="button"
          className="cycle-btn"
          style={{ marginTop: 14 }}
          onClick={() => setSplitWeek(null)}
        >
          Choose a different week
        </button>,
      );
    }
    const changeWeek = (
      <button
        type="button"
        className="today-change-week"
        onClick={() => setSplitWeek(null)}
        title="Change program week"
      >
        Week {splitWeek + 1} ▾
      </button>
    );
    return table(rows, `${dateLabel} · from your Master Split`, changeWeek);
  }
}
