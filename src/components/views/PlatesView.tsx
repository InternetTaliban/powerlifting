import type { ReactNode } from 'react';
import { useStore, useUI } from '../../store/store';
import { commit } from '../../store/store';
import { getState } from '../../lib/state';
import { SubViewHeader } from './SubViewHeader';
import { programs } from '../../lib/data';
import { calculateWeight, makeRowId } from '../../lib/calc';
import {
  BAR_WEIGHT, PLATE_COLORS, isBarbellLift, platesRounded, effectiveDenoms,
  plateHeight, formatPlateNum,
} from '../../lib/plates';
import type { PlateOpts, PlatesResult } from '../../lib/plates';
import type { ProgramDay, ProgramSegment, Unit } from '../../lib/types';

function toggleAllow25(checked: boolean): void {
  getState().global.allow25kgPlates = checked;
  commit();
}

function Barbell({ res, unit }: { res: PlatesResult; unit: Unit }) {
  const colors = PLATE_COLORS[unit] || PLATE_COLORS.kg;
  return (
    <div className={'barbell' + (res.plates.length === 0 ? ' barbell-empty' : '')}>
      <span className="barbell-shaft" />
      <span className="barbell-collar" />
      {res.plates.map((d, i) => (
        <span
          key={i}
          className="barbell-plate"
          style={{ height: plateHeight(d, unit) + 'px', background: colors[d]?.bg }}
          title={`${formatPlateNum(d)} ${unit}`}
        />
      ))}
      <span className="barbell-sleeve" />
    </div>
  );
}

function BarbellRow({ res, unit, arrow, tag, logged }: {
  res: PlatesResult; unit: Unit; arrow?: string; tag?: string; logged?: boolean;
}) {
  return (
    <div className="plate-stack-row">
      <div className="plate-weight">
        {arrow ? `${arrow} ` : ''}{formatPlateNum(res.achieved)} {unit}
        {tag && <span className="plate-round-tag">{tag}</span>}
        {logged && (
          <svg className="logged-icon" aria-label="custom-logged">
            <use href="/assets/icons/sprite.svg#icon-wrench" />
          </svg>
        )}
      </div>
      <Barbell res={res} unit={unit} />
      <div className="plate-side-text">
        {res.plates.length
          ? `${res.plates.map(formatPlateNum).join(' + ')} / side`
          : (res.loadable ? `empty bar (${formatPlateNum(res.bar)} ${unit})` : 'below bar weight')}
      </div>
    </div>
  );
}

function Bracket({ target, unit, opts, only, logged }: {
  target: number; unit: Unit; opts: PlateOpts; only?: 'down' | 'up'; logged?: boolean;
}) {
  const r = platesRounded(target, unit, opts);
  if (only === 'down') {
    return <BarbellRow res={r.down} unit={unit} arrow="↓" logged={logged} />;
  }
  if (only === 'up') {
    return <BarbellRow res={r.up} unit={unit} arrow="↑" logged={logged} />;
  }
  if (r.exact) {
    return <BarbellRow res={r.down} unit={unit} logged={logged} />;
  }
  return (
    <>
      <BarbellRow res={r.down} unit={unit} arrow="↓" tag="round down" logged={logged} />
      <BarbellRow res={r.up} unit={unit} arrow="↑" tag="round up" />
    </>
  );
}

function LoadBlock({ label, spec, loggedVal, max, unit, opts }: {
  label: string;
  spec: ProgramDay | ProgramSegment;
  loggedVal: number | undefined;
  max: number;
  unit: Unit;
  opts: PlateOpts;
}) {
  let body: ReactNode;
  if (loggedVal != null) {
    body = <Bracket target={Number(loggedVal)} unit={unit} opts={opts} logged />;
  } else if (spec.pctRange) {
    const low = parseFloat(calculateWeight(max, (spec.pct ?? 0) - spec.pctRange, spec.reps));
    const high = parseFloat(calculateWeight(max, (spec.pct ?? 0) + spec.pctRange, spec.reps));
    body = (
      <>
        <Bracket target={low} unit={unit} opts={opts} only="down" />
        <Bracket target={high} unit={unit} opts={opts} only="up" />
      </>
    );
  } else {
    body = <Bracket target={parseFloat(calculateWeight(max, spec.pct ?? 0, spec.reps))} unit={unit} opts={opts} />;
  }
  return (
    <div className="plate-load-block">
      <div className="plate-load-label">{label}</div>
      {body}
    </div>
  );
}

export function PlatesView() {
  const state = useStore();
  const ui = useUI();
  const lift = state.activeLift;
  const data = state.lifts[lift];

  if (!data || !isBarbellLift(lift)) {
    return (
      <>
        <SubViewHeader title="Plate Loading" />
        <div className="container">
          <p className="plate-empty-note">Plate loading is only available for barbell lifts.</p>
        </div>
      </>
    );
  }

  const programData = programs[data.program];
  const weekData = programData && programData[ui.platesWeekIndex];
  const unit = state.global.unit;
  const max = data.max;
  const opts: PlateOpts = { allow25: state.global.allow25kgPlates !== false };
  const colors = PLATE_COLORS[unit] || PLATE_COLORS.kg;

  return (
    <>
      <SubViewHeader title="Plate Loading" />
      <div className="container">
        <p className="plate-view-subtitle">{weekData ? `${lift} · Week ${weekData.week}` : ''}</p>
        <div id="platesContainer">
          {weekData && (
            <>
              {unit === 'kg' && (
                <div className="plate-controls">
                  <label className="plate-toggle">
                    <span className="plate-toggle-label">Allow 25 kg plates</span>
                    <span className="switch">
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label="Allow 25 kg plates"
                        checked={!!opts.allow25}
                        onChange={(e) => toggleAllow25(e.target.checked)}
                      />
                      <span className="switch-slider" />
                    </span>
                  </label>
                </div>
              )}
              <p className="plate-bar-caption">
                Standard bar {formatPlateNum(BAR_WEIGHT[unit] || BAR_WEIGHT.kg)} {unit}. One side shown —
                load the same on both. Weights round to the nearest loadable plates.
              </p>
              <div className="plate-legend">
                {effectiveDenoms(unit, opts).map((d) => (
                  <span className="plate-legend-item" key={d}>
                    <span className="plate-legend-swatch" style={{ background: colors[d]?.bg }} />
                    <span>{formatPlateNum(d)} {unit}</span>
                  </span>
                ))}
              </div>
              {weekData.days.map((day, dIndex) => {
                if (day.isRest) {
                  return null;
                }
                const rowId = makeRowId(lift, data.program, ui.platesWeekIndex, dIndex, data.block || 0);
                const logged = (state.logged && state.logged[rowId]) || {};
                return (
                  <article className="plate-day-card" key={dIndex}>
                    <h3 className="plate-day-name">{day.name}</h3>
                    <LoadBlock
                      label="Top set" spec={day} loggedVal={logged.main}
                      max={max} unit={unit} opts={opts}
                    />
                    {day.backoff && (
                      <LoadBlock
                        label="Backoff" spec={day.backoff} loggedVal={logged.backoff}
                        max={max} unit={unit} opts={opts}
                      />
                    )}
                    {day.backoff2 && (
                      <LoadBlock
                        label="Backoff 2" spec={day.backoff2} loggedVal={logged.backoff2}
                        max={max} unit={unit} opts={opts}
                      />
                    )}
                    {day.backoff3 && (
                      <LoadBlock
                        label="Backoff 3" spec={day.backoff3} loggedVal={logged.backoff3}
                        max={max} unit={unit} opts={opts}
                      />
                    )}
                  </article>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
