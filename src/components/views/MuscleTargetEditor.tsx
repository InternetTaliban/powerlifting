import { muscleGroups, muscleGroupsDict } from '../../lib/data';
import type { MuscleMapEntry } from '../../lib/types';

// Compact primary/secondary muscle picker over a single MuscleMapEntry. Used by the
// Add Variation form (local draft) and per-variation editing in Settings. Mutual
// exclusivity (a muscle is primary OR secondary, not both) is enforced by the caller's
// onToggle, mirroring the exercise-level toggleMuscle action.
export function MuscleTargetEditor({ map, onToggle }: {
  map: MuscleMapEntry;
  onToggle: (muscle: string, role: 'primary' | 'secondary', enabled: boolean) => void;
}) {
  return (
    <div className="muscle-target-editor">
      {muscleGroups.map((muscle) => {
        const isPrimary = (map.primary || []).includes(muscle);
        const isSecondary = (map.secondary || []).includes(muscle);
        return (
          <div className="muscle-target-row" key={muscle}>
            <span className="muscle-target-name">{muscleGroupsDict[muscle] || muscle}</span>
            <label className="muscle-target-role">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => onToggle(muscle, 'primary', e.target.checked)}
              />
              <span>Primary</span>
            </label>
            <label className="muscle-target-role">
              <input
                type="checkbox"
                checked={isSecondary}
                onChange={(e) => onToggle(muscle, 'secondary', e.target.checked)}
              />
              <span>Secondary</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
