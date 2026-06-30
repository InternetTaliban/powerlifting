import { useStore } from '../../store/store';
import { pullupPrograms, regularPrograms, muscleGroups, muscleGroupsDict } from '../../lib/data';
import { getProgramName } from '../../lib/programLookup';
import {
  updateIncrement, toggleProgramAccess, toggleVariationAccess, toggleMuscle, deleteExercise, openModal,
  setVariationMuscle,
} from '../../store/actions';
import { Icon } from '../Icon';
import { MuscleTargetEditor } from './MuscleTargetEditor';

export function ExerciseSettingsCard({ ex }: { ex: string }) {
  const state = useStore();
  const isPullup = ex === 'pullup';
  const programsToShow = isPullup ? pullupPrograms : regularPrograms;
  const step = state.global.unit === 'kg' ? '0.5' : '1';
  const map = state.fatigue.muscleMap[ex] || { primary: [], secondary: [] };

  return (
    <details className="settings-ex-card settings-ex-details">
      <summary className="settings-ex-header settings-ex-summary">
        <h4 className={isPullup ? 'pullup-label' : undefined}>{ex}</h4>
        <div className="settings-actions">
          <button
            className="icon-btn"
            type="button"
            title="Edit"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openModal('editExercise', { ex });
            }}
          ><Icon id="icon-edit" size={18} /></button>
          <button
            className="icon-btn icon-btn--danger"
            type="button"
            title="Delete"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteExercise(ex);
            }}
          ><Icon id="icon-trash" size={18} /></button>
          <span className="settings-ex-caret" aria-hidden="true"><Icon id="icon-chevron-right" size={18} /></span>
        </div>
      </summary>

      <div className="settings-increment">
        <label>Cycle Increment ({state.global.unit}):</label>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          defaultValue={state.increments[ex]}
          key={`${ex}-${state.increments[ex]}`}
          onChange={(e) => updateIncrement(ex, e.target.value)}
        />
      </div>

      <h5>Programs</h5>
      <div className="checkbox-group">
        {programsToShow.map((progKey) => (
          <label className={`checkbox-item${isPullup ? ' pullup-cb' : ''}`} key={progKey}>
            <input
              type="checkbox"
              checked={!!state.allowedPrograms[ex]?.includes(progKey)}
              onChange={(e) => toggleProgramAccess(ex, progKey, e.target.checked)}
            />
            {' ' + getProgramName(progKey)}
          </label>
        ))}
      </div>

      <h5>Variations</h5>
      <div className="settings-variation-list">
        {state.variationsDict[ex].map((varName, idx) => {
          const vmap = state.fatigue.variationMuscleMap?.[ex]?.[idx] || { primary: [], secondary: [] };
          return (
            <div className="settings-variation" key={idx}>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={state.allowedVariations[ex].includes(idx)}
                  onChange={(e) => toggleVariationAccess(ex, idx, e.target.checked)}
                />
                {' ' + varName}
              </label>
              <details className="settings-variation-muscles">
                <summary>Targeted muscles</summary>
                <p className="picker-hint">
                  Backoff sets for this variation count toward these muscles (otherwise the exercise's own).
                </p>
                <MuscleTargetEditor
                  map={vmap}
                  onToggle={(muscle, role, enabled) => setVariationMuscle(ex, idx, muscle, role, enabled)}
                />
              </details>
            </div>
          );
        })}
      </div>

      {([
        ['Primary Muscles', 'primary'],
        ['Secondary (peripheral) Muscles', 'secondary'],
      ] as const).map(([title, role]) => (
        <div key={role}>
          <h5>{title}</h5>
          <div className="checkbox-group">
            {muscleGroups.map((muscle) => (
              <label className="checkbox-item" key={muscle}>
                <input
                  type="checkbox"
                  checked={(map[role] || []).includes(muscle)}
                  onChange={(e) => toggleMuscle(ex, muscle, role, e.target.checked)}
                />
                {' ' + (muscleGroupsDict[muscle] || muscle)}
              </label>
            ))}
          </div>
        </div>
      ))}
    </details>
  );
}
