import { useStore } from '../../store/store';
import {
  goToProgramRow, toggleCalendarDone, assignCalendar, hideCalendarRow,
  deleteCustomWorkout, unassignCustomWorkout,
} from '../../store/actions';
import type { ProgramDay } from '../../lib/types';

interface ProgramPillProps {
  kind: 'program';
  rowId: string;
  ex: string;
  dayObj: ProgramDay;
  programName: string;
  isAssigned: boolean;
  wIndex: number;
  weekLabel: string;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
}

interface CustomPillProps {
  kind: 'custom';
  id: string;
  name: string;
  note: string;
  isAssigned: boolean;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
}

type Props = ProgramPillProps | CustomPillProps;

function Goto({ rowId, ex }: { rowId: string; ex: string }) {
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToProgramRow(rowId, ex);
  };
  return (
    <button
      type="button"
      className="pill-goto-btn"
      title="Show in program"
      aria-label="Show in program"
      onClick={onClick}
    >
      <svg width="14" height="14" aria-hidden="true"><use href="/assets/icons/sprite.svg#icon-chevron-right" /></svg>
    </button>
  );
}

function Done({ id, isDone }: { id: string; isDone: boolean }) {
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCalendarDone(id);
  };
  return (
    <button
      type="button"
      className="pill-done-btn"
      title={isDone ? 'Mark incomplete' : 'Mark complete'}
      onClick={onClick}
    >
      <svg width="13" height="13" aria-hidden="true"><use href="/assets/icons/sprite.svg#icon-check" /></svg>
    </button>
  );
}

export function WorkoutPill(props: Props) {
  const state = useStore();

  if (props.kind === 'program') {
    const { rowId, ex, dayObj, programName, isAssigned, wIndex, weekLabel, selected, onSelect, onDragStart } = props;
    const isBuildTheme = programName.startsWith('building')
      || programName.startsWith('rpe_')
      || programName === 'pullup_double';
    const theme = isBuildTheme ? '' : 'peak-theme';
    const isDone = !!state.completed[rowId];
    const cls = ['workout-pill', theme, `week-${wIndex}`, isDone && 'done', selected && 'selected']
      .filter(Boolean).join(' ');

    const onDrag = (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', rowId);
      onDragStart();
    };
    const onRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isAssigned) {
        assignCalendar(rowId, 'unassigned');
      } else {
        hideCalendarRow(rowId);
      }
    };

    return (
      <div className={cls} draggable onClick={onSelect} onDragStart={onDrag}>
        <span
          className="pill-week-badge"
          title={weekLabel ? `Block Week ${weekLabel}` : `Block Week ${wIndex + 1}`}
        >
          W{wIndex + 1}
        </span>
        <span className="pill-title">{ex.toUpperCase()}: {dayObj.name.split('(')[0].trim()}</span>
        <div className="pill-actions">
          <Goto rowId={rowId} ex={ex} />
          <Done id={rowId} isDone={isDone} />
          <button
            type="button"
            className={`pill-action-btn ${isAssigned ? '' : 'del'}`}
            title={isAssigned ? 'Remove from day' : 'Hide workout'}
            onClick={onRemove}
          >
            <svg width={isAssigned ? 12 : 13} height={isAssigned ? 12 : 13} aria-hidden="true">
              <use href={`/assets/icons/sprite.svg#${isAssigned ? 'icon-x' : 'icon-trash'}`} />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const { id, name, note, isAssigned, selected, onSelect, onDragStart } = props;
  const isDone = !!state.completed[id];
  const cls = ['workout-pill', 'custom-theme', isDone && 'done', selected && 'selected'].filter(Boolean).join(' ');

  const onDrag = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', id);
    onDragStart();
  };
  const onRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAssigned) {
      unassignCustomWorkout(id);
    } else {
      deleteCustomWorkout(id);
    }
  };

  return (
    <div className={cls} draggable onClick={onSelect} onDragStart={onDrag}>
      <span className="pill-custom-badge" title="Custom workout">Custom</span>
      <span className="pill-title" title={note || undefined}>{name}</span>
      <div className="pill-actions">
        <Done id={id} isDone={isDone} />
        <button
          type="button"
          className={`pill-action-btn ${isAssigned ? '' : 'del'}`}
          title={isAssigned ? 'Remove from day' : 'Delete custom workout'}
          onClick={onRemove}
        >
          <svg width={isAssigned ? 12 : 13} height={isAssigned ? 12 : 13} aria-hidden="true">
            <use href={`/assets/icons/sprite.svg#${isAssigned ? 'icon-x' : 'icon-trash'}`} />
          </svg>
        </button>
      </div>
    </div>
  );
}
