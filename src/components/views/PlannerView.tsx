import { useState } from 'react';
import { useStore } from '../../store/store';
import { SubViewHeader } from './SubViewHeader';
import { WorkoutPill } from './WorkoutPill';
import { weekDays, DAYS_PER_WEEK } from '../../lib/data';
import { getProgram } from '../../lib/programLookup';
import { makeRowId } from '../../lib/calc';
import { parseRowId } from '../../lib/rowId';
import { formatDate, formatDisplayDate, getMonday } from '../../util/date';
import {
  cycleCalendarWeek, clearCalendarWeek, restoreHiddenWorkouts, autoAssignMasterSplit,
  assignCalendar, openModal,
} from '../../store/actions';
import { Icon } from '../Icon';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function PlannerView() {
  const state = useStore();
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selected, setSelected] = useState<string | null>(null);

  const dropOn = (dateStr: string, rowId?: string) => {
    const id = rowId || selected;
    if (!id) {
      return;
    }
    assignCalendar(id, dateStr);
    setSelected(null);
  };

  const tapDay = (dateStr: string) => {
    if (selected) {
      dropOn(dateStr);
    }
  };
  const tapSelect = (rowId: string) => setSelected((cur) => (cur === rowId ? null : rowId));

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };
  const onUnassignedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      assignCalendar(id, 'unassigned');
      setSelected(null);
    }
  };
  const onPoolClick = () => {
    if (selected) {
      assignCalendar(selected, 'unassigned');
      setSelected(null);
    }
  };

  return (
    <>
      <SubViewHeader title="Weekly Planner" />
      <div className="container">
        <MonthCalendar
          monthDate={monthDate}
          weekStart={weekStart}
          setMonthDate={setMonthDate}
          onPickWeek={(d) => setWeekStart(getMonday(d))}
        />

        <fieldset className="controls" style={{ justifyContent: 'space-between', marginTop: 18 }}>
          <legend className="sr-only">Planner controls</legend>
          <div className="input-group">
            <label htmlFor="btnCalendarWeek">Block Week</label>
            <button id="btnCalendarWeek" className="cycle-btn" type="button" onClick={() => cycleCalendarWeek()}>
              Week {state.global.calendarWeek + 1}
            </button>
          </div>
          <div className="input-group">
            <label>Planner Actions</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="auto-assign-btn"
                type="button"
                onClick={() => autoAssignMasterSplit(weekStart)}
                title="Auto-assign to master split"
              >
                <Icon id="icon-check-square" size={20} />
              </button>
              <button
                className="goto-btn"
                type="button"
                style={{ background: '#f44336' }}
                onClick={() => clearCalendarWeek(weekStart)}
                title="Clear this week"
              >
                <Icon id="icon-trash" size={20} />
              </button>
            </div>
          </div>
        </fieldset>

        <div className="calendar-layout">
          <aside
            className="unassigned-container"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onUnassignedDrop}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ margin: 0, color: '#aaa' }}>Unassigned Workouts</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="po-box-btn"
                  type="button"
                  onClick={() => openModal('logWorkout', { context: 'planner' })}
                >
                  + Workout
                </button>
                <button className="po-box-btn" type="button" onClick={() => openModal('customWorkout')}>
                  + Custom
                </button>
                <button className="po-box-btn" type="button" onClick={() => restoreHiddenWorkouts()}>
                  Restore Deleted
                </button>
              </div>
            </div>
            <div id="unassignedPool" className="pool-grid" onClick={onPoolClick}>
              <UnassignedPool selected={selected} onSelect={tapSelect} />
            </div>
          </aside>
          <WeekGrid weekStart={weekStart} selected={selected} onSelect={tapSelect} onTapDay={tapDay} onDrop={dropOn} />
        </div>
      </div>
    </>
  );
}

function MonthCalendar({ monthDate, weekStart, setMonthDate, onPickWeek }: {
  monthDate: Date; weekStart: Date; setMonthDate: (d: Date) => void; onPickWeek: (d: Date) => void;
}) {
  const state = useStore();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const selStart = formatDate(weekStart);
  const selEndD = new Date(weekStart);
  selEndD.setDate(selEndD.getDate() + 6);
  const selEnd = formatDate(selEndD);

  const workoutMap: Record<string, { total: number; done: number }> = {};
  for (const rowId of Object.keys(state.calendar)) {
    const date = state.calendar[rowId];
    if (!date || date === 'hidden' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue;
    }
    if (!workoutMap[date]) {
      workoutMap[date] = { total: 0, done: 0 };
    }
    workoutMap[date].total++;
    if (state.completed[rowId]) {
      workoutMap[date].done++;
    }
  }

  const changeMonth = (dir: number) => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + dir);
    setMonthDate(d);
  };

  const cells = [];
  for (let i = 0; i < startPad; i++) {
    cells.push(<div key={`pad${i}`} className="month-cell empty" />);
  }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const cellDate = new Date(year, month, day);
    const cellStr = formatDate(cellDate);
    const inWeek = cellStr >= selStart && cellStr <= selEnd;
    const info = workoutMap[cellStr];
    const cls = [
      'month-cell',
      inWeek && 'selected-week-day',
      info && (info.done === info.total ? 'day-all-done' : 'day-has-workout'),
    ].filter(Boolean).join(' ');
    cells.push(<div key={cellStr} className={cls} onClick={() => onPickWeek(cellDate)}>{day}</div>);
  }

  return (
    <section className="month-calendar-wrapper" aria-label="Month calendar">
      <div className="month-header">
        <button className="icon-btn" type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
          <Icon id="icon-chevron-left" size={22} />
        </button>
        <h3 style={{ margin: 0, color: 'white' }}>{MONTH_NAMES[month]} {year}</h3>
        <button className="icon-btn" type="button" onClick={() => changeMonth(1)} aria-label="Next month">
          <Icon id="icon-chevron-right" size={22} />
        </button>
      </div>
      <div className="month-days-header" aria-hidden="true">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>
      <div id="monthGrid" className="month-grid" role="grid" aria-label="Calendar days">{cells}</div>
    </section>
  );
}

function UnassignedPool({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const state = useStore();
  const week = state.global.calendarWeek;
  const pills: JSX.Element[] = [];

  for (const ex of state.exercises) {
    const data = state.lifts[ex];
    const programData = getProgram(data.program);
    const weekData = programData?.[week];
    if (!weekData) {
      continue;
    }
    for (let dIndex = 0; dIndex < weekData.days.length; dIndex++) {
      const dayObj = weekData.days[dIndex];
      if (dayObj.isRest) {
        continue;
      }
      const rowId = makeRowId(ex, data.program, week, dIndex, data.block || 0);
      if (state.calendar[rowId]) {
        continue;
      }
      pills.push(
        <WorkoutPill
          key={rowId} kind="program" rowId={rowId} ex={ex} dayObj={dayObj} programName={data.program}
          isAssigned={false} wIndex={week} weekLabel={String(weekData.week)} selected={selected === rowId}
          onSelect={() => onSelect(rowId)} onDragStart={() => onSelect(rowId)}
        />,
      );
    }
  }

  for (const id of Object.keys(state.customWorkouts || {})) {
    const def = state.customWorkouts[id];
    if (!def || state.calendar[id]) {
      continue;
    }
    pills.push(
      <WorkoutPill
        key={id} kind="custom" id={id} name={def.name} note={def.note}
        isAssigned={false} selected={selected === id}
        onSelect={() => onSelect(id)} onDragStart={() => onSelect(id)}
      />,
    );
  }

  return <>{pills}</>;
}

function WeekGrid({ weekStart, selected, onSelect, onTapDay, onDrop }: {
  weekStart: Date;
  selected: string | null;
  onSelect: (id: string) => void;
  onTapDay: (d: string) => void;
  onDrop: (d: string, rowId?: string) => void;
}) {
  const state = useStore();

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };
  const onDayDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      onDrop(dateStr, id);
    }
  };

  return (
    <div id="calendarDaysContainer" className="calendar-grid">
      {Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        const dateStr = formatDate(day);

        const pills: JSX.Element[] = [];
        let total = 0;
        let done = 0;

        for (const rowId of Object.keys(state.calendar)) {
          if (rowId.startsWith('cw-') || state.calendar[rowId] !== dateStr) {
            continue;
          }
          const p = parseRowId(rowId);
          if (!p || !state.lifts[p.ex]) {
            continue;
          }
          const weekData = getProgram(p.program)?.[p.week];
          const dayObj = weekData?.days[p.day];
          if (!dayObj || dayObj.isRest) {
            continue;
          }
          total++;
          if (state.completed[rowId]) {
            done++;
          }
          pills.push(
            <WorkoutPill
              key={rowId} kind="program" rowId={rowId} ex={p.ex} dayObj={dayObj} programName={p.program}
              isAssigned wIndex={p.week} weekLabel={String(weekData!.week)} selected={selected === rowId}
              onSelect={() => onSelect(rowId)} onDragStart={() => onSelect(rowId)}
            />,
          );
        }

        for (const id of Object.keys(state.customWorkouts || {})) {
          const def = state.customWorkouts[id];
          if (!def || state.calendar[id] !== dateStr) {
            continue;
          }
          total++;
          if (state.completed[id]) {
            done++;
          }
          pills.push(
            <WorkoutPill
              key={id} kind="custom" id={id} name={def.name} note={def.note} isAssigned
              selected={selected === id} onSelect={() => onSelect(id)} onDragStart={() => onSelect(id)}
            />,
          );
        }

        const statusCls = total > 0 ? (done === total ? ' day-all-done' : ' day-has-workout') : '';
        return (
          <article
            key={dateStr}
            className={'calendar-day-card' + statusCls}
            onClick={() => onTapDay(dateStr)}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDayDrop(e, dateStr)}
          >
            <header className="day-header">
              <span>{weekDays[i]}</span>
              <time dateTime={dateStr} className="day-date-sub">{formatDisplayDate(day)}</time>
            </header>
            <div className="day-dropzone">{pills}</div>
          </article>
        );
      })}
    </div>
  );
}
