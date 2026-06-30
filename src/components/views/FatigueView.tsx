import { useStore } from '../../store/store';
import { SubViewHeader } from './SubViewHeader';
import { ensureFatigueState } from '../../lib/fatigue';
import {
  computeMuscleVolume, weeklySetsForExercise, volumeZone, zoneLabels, fmtSets,
} from '../../lib/fatigue';
import { muscleGroups, muscleGroupsDict } from '../../lib/data';
import { cycleFatigueWeek, updateTolerance, resetFatigueTolerance } from '../../store/actions';

export function FatigueView() {
  const state = useStore();
  ensureFatigueState();

  const week = state.fatigue.week;
  const { totals, contributors } = computeMuscleVolume(week);

  const unmapped = state.exercises.filter((ex) => {
    const m = state.fatigue.muscleMap[ex] || { primary: [], secondary: [] };
    const mapped = (m.primary || []).length || (m.secondary || []).length;
    return !mapped && weeklySetsForExercise(ex, week) > 0;
  });

  const reset = (
    <button
      className="nav-btn"
      type="button"
      onClick={() => resetFatigueTolerance()}
      title="Reset volume landmarks to defaults"
    >
      Reset
    </button>
  );

  return (
    <>
      <SubViewHeader title="Fatigue Manager" action={reset} />
      <div className="container">
        <p className="fatigue-intro">
          Estimated weekly working sets per muscle group, summed from each lift's current program.
          Secondary muscles (peripheral fatigue) are counted at the peripheral factor of a working set.
          Tune each muscle's MEV (minimum effective volume) and MRV (max recoverable volume) to match your
          own recovery — raise MRV if you handle volume well, lower it if you don't.
        </p>
        <p className="fatigue-peripheral-hint">
          Peripheral fatigue factor: <b>×{state.fatigue.peripheralFactor}</b> &mdash; adjust it in Settings.
        </p>

        <div className="fatigue-legend" aria-hidden="true">
          <span><i className="zone-under" /> Below MEV</span>
          <span><i className="zone-optimal" /> Optimal</span>
          <span><i className="zone-high" /> Near MRV</span>
          <span><i className="zone-over" /> Over MRV</span>
        </div>

        <fieldset className="controls fatigue-controls">
          <legend className="sr-only">Fatigue controls</legend>
          <div className="input-group">
            <label htmlFor="btnFatigueWeek">Block Week</label>
            <button id="btnFatigueWeek" className="cycle-btn" type="button" onClick={() => cycleFatigueWeek()}>
              Week {week + 1}
            </button>
          </div>
        </fieldset>

        <div id="fatigueContainer">
          {unmapped.length > 0 && (
            <p className="fatigue-unmapped-note">
              Not counted (no muscles assigned in Settings): {unmapped.join(', ')}
            </p>
          )}
          {muscleGroups.map((m) => {
            const sets = totals[m] || 0;
            const tol = state.fatigue.tolerance[m] || { mev: 0, mrv: 0 };
            const zone = volumeZone(sets, tol.mev, tol.mrv);
            const scaleMax = Math.max(tol.mrv * 1.15, sets, 1);
            const contribs = contributors[m] || [];
            return (
              <article className={`fatigue-muscle-card zone-${zone}`} key={m}>
                <div className="fatigue-muscle-head">
                  <h4>{muscleGroupsDict[m] || m}</h4>
                  <div className="fatigue-muscle-head-right">
                    <span className="fatigue-sets">{fmtSets(sets)} sets</span>
                    <span className={`fatigue-badge zone-${zone}`}>{zoneLabels[zone]}</span>
                  </div>
                </div>
                <div className="fatigue-bar-track">
                  <div
                    className={`fatigue-bar-fill zone-${zone}`}
                    style={{ width: Math.min(100, (sets / scaleMax) * 100) + '%' }}
                  />
                  {([['mev', tol.mev], ['mrv', tol.mrv]] as const).map(([key, val]) => (
                    val > 0 && val < scaleMax
                      ? (
                        <span
                          key={key}
                          className={`fatigue-marker fatigue-marker-${key}`}
                          style={{ left: (val / scaleMax) * 100 + '%' }}
                          title={`${key.toUpperCase()} ${val}`}
                        />
                      )
                      : null
                  ))}
                </div>
                <p className="fatigue-contributors">
                  {contribs.length
                    ? contribs.map((c) => `${c.ex} ${fmtSets(c.sets)}`).join('  ·  ')
                    : 'No exercises train this muscle'}
                </p>
                <div className="fatigue-tol-row">
                  {([['MEV', 'mev'], ['MRV', 'mrv']] as const).map(([label, key]) => (
                    <label className="fatigue-tol-field" key={key}>
                      <span>{label}</span>
                      <input
                        type="number" inputMode="numeric" min="0" step="1"
                        defaultValue={tol[key]}
                        key={`${m}-${key}-${tol[key]}`}
                        onChange={(e) => updateTolerance(m, key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
