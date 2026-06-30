import { useState } from 'react';
import { useStore } from '../../store/store';
import { SubViewHeader } from './SubViewHeader';
import { weekDays } from '../../lib/data';
import {
  getAllSplitSlots, placedSlotKeys, slotKey, buildDefaultMasterSplit, ensureMasterSplit,
} from '../../lib/masterSplit';
import { assignSlotToDay, removeSlotFromDay, resetMasterSplit } from '../../store/actions';

const SPLIT_COLORS = [
  '#5c6bc0', '#26a69a', '#ffa726', '#ec407a',
  '#66bb6a', '#ab47bc', '#42a5f5', '#ff7043',
];
const DAYS_IN_WEEK = 7;

export function ScheduleView() {
  const state = useStore();
  ensureMasterSplit();
  const [sel, setSel] = useState<string | null>(null);

  const colorFor = (ex: string) => {
    const i = state.exercises.indexOf(ex);
    return SPLIT_COLORS[(i < 0 ? 0 : i) % SPLIT_COLORS.length];
  };

  const allSlots = getAllSplitSlots();
  const slotMeta = new Map(allSlots.map((s) => [slotKey(s.ex, s.d), s]));
  const placed = placedSlotKeys();
  const poolSlots = allSlots.filter((s) => !placed.has(slotKey(s.ex, s.d)));

  const removeSlotFromAllDays = (ex: string, d: number) => {
    for (let i = 0; i < DAYS_IN_WEEK; i++) {
      removeSlotFromDay(ex, d, i);
    }
  };

  const dropTo = (wd: number | 'pool', key: string) => {
    const [ex, dStr] = key.split(':');
    const d = parseInt(dStr, 10);
    if (wd === 'pool') {
      removeSlotFromAllDays(ex, d);
    } else {
      assignSlotToDay(ex, d, wd);
    }
    setSel(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };
  const handleDrop = (e: React.DragEvent, wd: number | 'pool') => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const k = e.dataTransfer.getData('text/plain');
    if (k) {
      dropTo(wd, k);
    }
  };

  const tapSlot = (key: string) => setSel((cur) => (cur === key ? null : key));
  const tapDay = (wd: number) => {
    if (!sel) {
      return;
    }
    const [ex, dStr] = sel.split(':');
    assignSlotToDay(ex, parseInt(dStr, 10), wd);
    setSel(null);
  };

  const Pill = ({ ex, d, name, location }: { ex: string; d: number; name: string; location: number | 'pool' }) => {
    const key = slotKey(ex, d);
    const color = colorFor(ex);
    const cls = ['workout-pill', 'split-pill', sel === key && 'selected'].filter(Boolean).join(' ');

    const onDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', key);
      setSel(key);
    };
    const onClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      tapSlot(key);
    };

    return (
      <div className={cls} style={{ borderLeftColor: color }} draggable onDragStart={onDragStart} onClick={onClick}>
        <span className="pill-week-badge" style={{ background: color }}>{ex.slice(0, 2).toUpperCase()}</span>
        <span className="pill-title">{ex.toUpperCase()} · {name}</span>
        {location !== 'pool' && (
          <div className="pill-actions">
            <button
              type="button"
              className="pill-action-btn"
              title="Remove from day"
              onClick={(e) => {
                e.stopPropagation();
                removeSlotFromDay(ex, d, location);
              }}
            >
              <svg width="12" height="12" aria-hidden="true"><use href="/assets/icons/sprite.svg#icon-x" /></svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  const reset = (
    <button
      className="nav-btn"
      type="button"
      onClick={() => resetMasterSplit(buildDefaultMasterSplit)}
      title="Reset to default split"
    >
      Reset
    </button>
  );

  return (
    <>
      <SubViewHeader title="Master Split" action={reset} />
      <div className="container">
        <p className="split-help">
          Tap a workout, then tap a day to place it — or drag. Workouts come from each exercise's
          selected program. Days with no workouts are rest days.
        </p>

        <section
          className="split-pool-wrapper" aria-label="Available workouts"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'pool')}
        >
          <h4 className="split-section-label">Available Workouts</h4>
          <div id="splitPool" className="pool-grid">
            {poolSlots.length === 0
              ? <p className="split-empty-note">All workouts are placed. Remove one from a day to return it here.</p>
              : poolSlots.map((s) => <Pill key={slotKey(s.ex, s.d)} ex={s.ex} d={s.d} name={s.name} location="pool" />)}
          </div>
        </section>

        <div id="splitDays" className="calendar-grid" style={{ marginTop: 16 }}>
          {Array.from({ length: DAYS_IN_WEEK }, (_, wd) => {
            const slots = state.masterSplit?.[wd] || [];
            return (
              <article
                key={wd}
                className={'calendar-day-card split-day-card' + (slots.length ? ' day-has-workout' : '')}
                onClick={() => tapDay(wd)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, wd)}
              >
                <header className="day-header">
                  <span>{weekDays[wd]}</span>
                  <span className="day-date-sub">
                    {slots.length ? slots.length + (slots.length === 1 ? ' lift' : ' lifts') : 'Rest'}
                  </span>
                </header>
                <div className="day-dropzone">
                  {slots.length === 0
                    ? <span className="split-rest-placeholder">{sel ? 'Tap to place here' : 'Rest day'}</span>
                    : slots.map((s) => {
                        const meta = slotMeta.get(slotKey(s.ex, s.d));
                        return (
                          <Pill
                            key={slotKey(s.ex, s.d)}
                            ex={s.ex}
                            d={s.d}
                            name={meta ? meta.name : `Day ${s.d + 1}`}
                            location={wd}
                          />
                        );
                      })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
