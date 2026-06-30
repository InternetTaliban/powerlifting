import { useStore } from '../../store/store';
import { switchLift, openModal } from '../../store/actions';

export function ExerciseTabs() {
  const state = useStore();
  const { exercises, activeLift } = state;

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const count = exercises.length;
    if (count === 0) {
      return;
    }
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % count;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    switchLift(exercises[next]);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <nav className="nav-tabs-container" aria-label="Exercises">
      <div className="nav-tabs" id="navTabs" role="tablist">
        {exercises.map((ex, i) => {
          const isActive = ex === activeLift;
          return (
            <button
              key={ex}
              type="button"
              className={`tab ${isActive ? 'active' : ''}`}
              id={`tab-${i}`}
              role="tab"
              aria-selected={isActive ? 'true' : 'false'}
              aria-controls="programContainer"
              tabIndex={isActive ? 0 : -1}
              onClick={() => switchLift(ex)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {ex}
            </button>
          );
        })}
      </div>
      <button
        className="add-exercise-btn"
        type="button"
        onClick={() => openModal('addExercise')}
        title="Add exercise"
        aria-label="Add new exercise"
      >
        +
      </button>
    </nav>
  );
}
