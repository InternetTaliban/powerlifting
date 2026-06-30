import { useStore } from '../../store/store';
import { buildProgramRow, rowTheme, showCompleteButton } from './ProgramRow';
import { getProgram } from '../../lib/programLookup';
import { isBarbellLift } from '../../lib/plates';
import { openPlatesView, progressCycle, setActiveView } from '../../store/actions';

// The program table for one lift. Used both for the live #programContainer
// (interactive) and, with interactive=false, for the display-only peek panels
// the swipe overlay slides in (see SwipeDeck) — same markup, so the peek and the
// real table are pixel-identical.
export function ProgramContent({ lift, interactive = true }: { lift: string; interactive?: boolean }) {
  const state = useStore();
  const data = state.lifts[lift];
  if (!data) {
    return null;
  }
  const programData = getProgram(data.program) || [];
  const unit = state.global.unit;
  const showPlates = isBarbellLift(lift);
  const theme = rowTheme(data.program);
  const inert = interactive ? {} : { tabIndex: -1, 'aria-hidden': true };

  return (
    <>
      {programData.map((weekData, wIndex) => {
        const rows = weekData.days
          .map((day, dIndex) => (day.isRest ? null : buildProgramRow(lift, data.program, wIndex, dIndex, { interactive })))
          .filter(Boolean);
        if (rows.length === 0) {
          return null;
        }
        return (
          <article className="week-card" key={wIndex}>
            <header className={`week-header ${theme}`}>
              <span className="week-title">Week {weekData.week}</span>
              {showPlates && (
                <button
                  className="week-plate-btn"
                  type="button"
                  title="Plate loading for this week"
                  aria-label="Plate loading for this week"
                  onClick={interactive ? (e) => { e.stopPropagation(); openPlatesView(wIndex); } : undefined}
                  {...inert}
                >
                  <span className="mini-barbell" aria-hidden="true">
                    <span className="mini-barbell-shaft" />
                    <span className="mini-barbell-plate mini-barbell-plate-1" />
                    <span className="mini-barbell-plate mini-barbell-plate-2" />
                    <span className="mini-barbell-sleeve" />
                  </span>
                </button>
              )}
            </header>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Day</th>
                  <th style={{ width: '28%' }}>Sets/Reps</th>
                  <th style={{ width: '28%' }}>Load</th>
                  <th style={{ width: '20%' }}>
                    RPE <button
                      className="info-icon"
                      type="button"
                      onClick={interactive ? (e) => { e.stopPropagation(); setActiveView('rpeView'); } : undefined}
                      aria-label="RPE guide"
                      {...inert}
                    >i</button>
                  </th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </article>
        );
      })}
      {showCompleteButton(data.program) && (
        <button
          className="btn-progress"
          type="button"
          onClick={interactive ? () => progressCycle() : undefined}
          {...inert}
        >
          Complete Block &amp; Recalculate (+{state.increments[lift] || (unit === 'kg' ? 2.5 : 5)} {unit})
        </button>
      )}
    </>
  );
}
