import { useState } from 'react';
import { state } from '../../lib/state';
import { Modal, CloseButton } from '../common/Modal';
import { closeModal, saveLoggedWeight, resetLoggedWeight } from '../../store/actions';
import { getProgram } from '../../lib/programLookup';
import { getRepModifier } from '../../lib/calc';

interface Props { rowId: string; lift: string; program: string; w: number; d: number; }

interface Entry { key: string; label: string; down: number; up: number; }

export function LogWeightModal({ rowId, lift, program, w, d }: Props) {
  const day = getProgram(program)![w].days[d];
  const max = state.lifts[lift].max;
  const unit = state.global.unit;
  const step = unit === 'kg' ? 2.5 : 5;
  const existing = state.logged?.[rowId] || {};

  const rd = (pct: number, reps: number | string | undefined) =>
    +(Math.floor((max * Math.max(0.01, pct + getRepModifier(reps, lift))) / step) * step).toFixed(1);
  const ru = (pct: number, reps: number | string | undefined) =>
    +(Math.ceil((max * Math.max(0.01, pct + getRepModifier(reps, lift))) / step) * step).toFixed(1);

  const segs: { key: string; label: string; spec: { pct?: number; reps?: number | string } }[] = [
    { key: 'main', label: `Main  ${day.sets}×${day.reps}`, spec: day },
  ];
  if (day.backoff) {
    segs.push({ key: 'backoff', label: `Backoff  ${day.backoff.sets}×${day.backoff.reps}`, spec: day.backoff });
  }
  if (day.backoff2) {
    segs.push({ key: 'backoff2', label: `Backoff 2  ${day.backoff2.sets}×${day.backoff2.reps}`, spec: day.backoff2 });
  }
  if (day.backoff3) {
    segs.push({ key: 'backoff3', label: `Backoff 3  ${day.backoff3.sets}×${day.backoff3.reps}`, spec: day.backoff3 });
  }

  const entries: Entry[] = segs.map(({ key, label, spec }) => ({
    key,
    label,
    down: rd(spec.pct ?? 0, spec.reps),
    up: ru(spec.pct ?? 0, spec.reps),
  }));

  const initial: Record<string, number> = {};
  for (const e of entries) {
    initial[e.key] = existing[e.key] ?? e.down;
  }
  const [vals, setVals] = useState<Record<string, number>>(initial);
  const [customKeys, setCustomKeys] = useState<Set<string>>(() => {
    const initialCustom = new Set<string>();
    for (const e of entries) {
      const sv = existing[e.key];
      if (sv != null && sv !== e.down && sv !== e.up) {
        initialCustom.add(e.key);
      }
    }
    return initialCustom;
  });

  const pick = (key: string, value: number) => {
    setVals((v) => ({ ...v, [key]: value }));
    setCustomKeys((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
  };
  const activateCustom = (key: string) => setCustomKeys((s) => new Set(s).add(key));

  return (
    <Modal id="logWeightModal">
      <CloseButton onClick={() => closeModal()} />
      <h3 id="logWeightTitle">Log Weight — {day.name}</h3>
      <div id="logWeightBody">
        {entries.map((e) => {
          const isCustom = customKeys.has(e.key);
          return (
            <div className="log-entry" key={e.key}>
              <p className="log-entry-label">{e.label}</p>
              <div className="log-options">
                <button
                  type="button"
                  className={'log-opt' + (!isCustom && vals[e.key] === e.down ? ' selected' : '')}
                  onClick={() => pick(e.key, e.down)}
                >
                  ↓ {e.down} {unit}
                </button>
                <button
                  type="button"
                  className={'log-opt' + (!isCustom && vals[e.key] === e.up ? ' selected' : '')}
                  onClick={() => pick(e.key, e.up)}
                >
                  ↑ {e.up} {unit}
                </button>
                <button
                  type="button"
                  className={'log-opt log-opt-custom' + (isCustom ? ' selected' : '')}
                  onClick={() => activateCustom(e.key)}
                >
                  Custom
                </button>
              </div>
              <input
                type="number" step="0.5" inputMode="decimal" className="log-custom-input"
                value={vals[e.key]}
                style={{ display: isCustom ? 'block' : 'none' }}
                onChange={(ev) => setVals((v) => ({ ...v, [e.key]: parseFloat(ev.target.value) || 0 }))}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          className="btn-progress"
          type="button"
          style={{ background: 'var(--btn)', border: '1px solid #555', color: '#ccc' }}
          onClick={() => resetLoggedWeight(rowId)}
        >
          Reset
        </button>
        <button className="btn-progress" type="button" onClick={() => saveLoggedWeight(rowId, vals)}>Save</button>
      </div>
    </Modal>
  );
}
