import { useRef } from 'react';
import { useStore } from '../../store/store';
import { ExerciseTabs } from './ExerciseTabs';
import { LiftControls } from './LiftControls';
import { ProgramContent } from '../program/ProgramContent';
import { SwipeDeck } from './SwipeDeck';
import { openModal } from '../../store/actions';
import { useLongPress } from '../../hooks/useLongPress';

export function TrainingView() {
  const state = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  useLongPress(containerRef);

  const lift = state.activeLift;
  const data = lift ? state.lifts[lift] : undefined;

  return (
    <div className="container">
      <ExerciseTabs />
      {data && <LiftControls />}
      <div id="programContainer" ref={containerRef} role="tabpanel">
        {!data ? <EmptyState /> : <ProgramContent lift={lift} />}
      </div>
      <SwipeDeck containerRef={containerRef} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <p className="empty-state-title">No lifts yet</p>
      <p className="empty-state-msg">Add your first lift to start building your training program.</p>
      <button
        type="button"
        className="btn-progress empty-state-btn"
        onClick={() => openModal('addExercise')}
      >
        Add your first lift
      </button>
    </div>
  );
}
