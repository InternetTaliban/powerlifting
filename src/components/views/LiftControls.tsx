import { useStore, useUI } from '../../store/store';
import {
  setLiftMax, openModal, toggleRepAdjusters, toggleRoughLoads, setRepModifier,
} from '../../store/actions';
import { getProgramName, programHasBackoff } from '../../lib/programLookup';
import type { CSSProperties } from 'react';
import type { ControlKey, RepModifiers } from '../../lib/types';

const RANGES: { key: keyof RepModifiers; label: string }[] = [
  { key: 'singles', label: 'Singles' },
  { key: 'triples', label: 'Triples' },
  { key: 'volume', label: 'Volume' },
];

export function LiftControls() {
  const state = useStore();
  const ui = useUI();
  const lift = state.activeLift;
  const data = state.lifts[lift];
  if (!data) {
    return null;
  }

  const cfg = state.global.controls;
  const mods = data.repModifiers || { singles: 0, triples: 0, volume: 0 };

  const wrap = (key: ControlKey, children: React.ReactNode) => {
    let hidden = cfg.layout[key] === 'hidden';
    if (key === 'variation' && !programHasBackoff(data.program)) {
      hidden = true;
    }
    const style: CSSProperties = { order: cfg.order.indexOf(key), display: hidden ? 'none' : 'flex' };
    return (
      <div className="input-group" data-control={key} style={style} key={key}>{children}</div>
    );
  };

  const modColor = (v: number) => (v > 0 ? 'var(--accent)' : v < 0 ? 'var(--accent-peak)' : '#888');

  const onMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!setLiftMax(parseFloat(e.target.value))) {
      e.target.value = String(data.max);
    }
  };

  return (
    <>
      <fieldset className="controls">
        <legend className="sr-only">Lift settings</legend>
        {wrap('max', (
          <>
            <label htmlFor="liftMax">1 Rep Max</label>
            <input
              type="number" id="liftMax" step="0.5" inputMode="decimal"
              defaultValue={data.max}
              key={`${lift}-${data.max}`}
              onChange={onMaxChange}
            />
          </>
        ))}
        {wrap('program', (
          <>
            <label htmlFor="btnProgram">Program Type</label>
            <button
              id="btnProgram"
              className="cycle-btn picker-btn"
              type="button"
              aria-haspopup="dialog"
              onClick={() => openModal('programPicker')}
            >
              {getProgramName(data.program)}
            </button>
          </>
        ))}
        {wrap('variation', (
          <>
            <label htmlFor="btnVariation">Backoff Variation</label>
            <button
              id="btnVariation"
              className="cycle-btn picker-btn"
              type="button"
              aria-haspopup="dialog"
              onClick={() => openModal('variationPicker')}
            >
              {state.variationsDict[lift]?.[data.variation]}
            </button>
          </>
        ))}
        {wrap('adjust', (
          <>
            <label htmlFor="btnLiftAdjustments">Lift Adjustments</label>
            <button
              id="btnLiftAdjustments"
              className="cycle-btn"
              type="button"
              aria-expanded={ui.repAdjustersOpen}
              aria-controls="repAdjusters"
              onClick={() => toggleRepAdjusters()}
            >
              {ui.repAdjustersOpen ? 'Hide' : 'Show'}
            </button>
          </>
        ))}
        {wrap('warmup', (
          <>
            <label htmlFor="btnWarmup">Warm-up</label>
            <button
              id="btnWarmup"
              className="cycle-btn"
              type="button"
              aria-haspopup="dialog"
              onClick={() => openModal('warmup')}
            >
              Show
            </button>
          </>
        ))}
        {wrap('loads', (
          <>
            <label htmlFor="btnRoughLoads">Loads</label>
            <button
              id="btnRoughLoads"
              className="cycle-btn"
              type="button"
              aria-pressed={state.global.roughLoads ? 'true' : 'false'}
              onClick={() => toggleRoughLoads()}
            >
              {state.global.roughLoads ? 'Rough' : 'Detailed'}
            </button>
          </>
        ))}
      </fieldset>

      {ui.repAdjustersOpen && (
        <div className="rep-adjusters" id="repAdjusters">
          <p className="rep-adjusters-label">Rep Range Adjusters</p>
          {RANGES.map(({ key, label }) => {
            const val = mods[key] || 0;
            return (
              <div className="rep-adjuster-row" key={key}>
                <span className="rep-label">
                  {label}
                  <span className="rep-value" style={{ color: modColor(val) }}>{(val > 0 ? '+' : '') + val}%</span>
                </span>
                <input
                  type="range" min="-15" max="15" step="1" value={val}
                  aria-label={`${label} intensity adjustment`}
                  onChange={(e) => setRepModifier(key, parseInt(e.target.value, 10))}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
