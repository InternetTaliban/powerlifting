import { useState } from 'react';
import { useStore } from '../../store/store';
import { Modal, CloseButton } from '../common/Modal';
import { closeModal, setWarmupSets, setWarmupStart } from '../../store/actions';
import { ensureWarmupState, warmupPrefs } from '../../lib/warmup';
import { topWorkingPct, calculateWeight, generateWarmups } from '../../lib/calc';

export function WarmupModal() {
  const state = useStore();
  ensureWarmupState();
  const lift = state.activeLift;
  const saved = warmupPrefs(lift);
  // Local preview state; committed to the store on slider release (onChange).
  const [sets, setSets] = useState(saved.sets);
  const [startPct, setStartPct] = useState(saved.startPct);
  const unit = state.global.unit;

  const topPct = topWorkingPct(lift);
  const workingWeight = topPct > 0 ? parseFloat(calculateWeight(state.lifts[lift].max, topPct)) : 0;
  const steps = workingWeight > 0 ? generateWarmups(workingWeight, sets, startPct) : [];

  const chartH = 150;
  const labelSpace = 42;
  const avail = chartH - labelSpace;
  const bars = [
    ...steps.map((s, i) => ({ weight: s.weight, label: 'W' + (i + 1), work: false })),
    { weight: workingWeight, label: 'Work', work: true },
  ];

  return (
    <Modal id="warmupModal">
      <CloseButton onClick={() => closeModal()} />
      <h3>Warm-up — <span>{lift}</span></h3>
      <p className="warmup-target">
        {workingWeight <= 0
          ? 'No working sets to warm up for in this program.'
          : `Top working set: ${workingWeight} ${unit} · ${Math.round(topPct * 100)}% of 1RM`}
      </p>

      {workingWeight > 0 && (
        <>
          <div className="warmup-chart" aria-hidden="true">
            {bars.map((b, i) => (
              <div className={'warmup-bar' + (b.work ? ' work' : '')} key={i}>
                <span className="warmup-bar-weight">{b.weight}</span>
                <div
                  className="warmup-bar-fill"
                  style={{ height: Math.max(4, Math.round((b.weight / workingWeight) * avail)) + 'px' }}
                />
                <span className="warmup-bar-label">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="warmup-table">
            {steps.map((s, i) => (
              <div className="warmup-row" key={i}>
                <span className="warmup-row-name">Warm-up {i + 1}</span>
                <span className="warmup-row-load">{s.weight} {unit} × {s.reps}</span>
              </div>
            ))}
            <div className="warmup-row warmup-row-work">
              <span>Working set</span>
              <span className="warmup-row-load">{workingWeight} {unit}</span>
            </div>
          </div>
        </>
      )}

      <div className="warmup-controls">
        <label className="warmup-slider">
          <span>Warm-up sets: <strong>{sets}</strong></span>
          <input
            type="range" min="1" max="8" step="1" value={sets}
            aria-label="Number of warm-up sets"
            onInput={(e) => setSets(parseInt((e.target as HTMLInputElement).value, 10))}
            onChange={(e) => setWarmupSets(parseInt(e.target.value, 10))}
          />
        </label>
        <label className="warmup-slider">
          <span>First set: <strong>{Math.round(startPct * 100)}%</strong> of top</span>
          <input
            type="range" min="10" max="90" step="5" value={Math.round(startPct * 100)}
            aria-label="First warm-up set as a percentage of the top working set"
            onInput={(e) => setStartPct(parseInt((e.target as HTMLInputElement).value, 10) / 100)}
            onChange={(e) => setWarmupStart(parseInt(e.target.value, 10))}
          />
        </label>
      </div>
    </Modal>
  );
}
