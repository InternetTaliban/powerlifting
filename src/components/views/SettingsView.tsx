import { useRef } from 'react';
import { useStore } from '../../store/store';
import { SubViewHeader } from './SubViewHeader';
import { DesignCard } from './DesignCard';
import { ExerciseSettingsCard } from './ExerciseSettingsCard';
import { ensureFatigueState } from '../../lib/fatigue';
import {
  toggleBackPosition, setDialogOffset, exportSettings, importStateFromText, factoryReset,
  updatePeripheralFactor, setActiveView,
} from '../../store/actions';

export function SettingsView() {
  const state = useStore();
  ensureFatigueState();
  const fileRef = useRef<HTMLInputElement>(null);

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const resetInput = () => {
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    };
    const reader = new FileReader();
    reader.onload = (ev) => importStateFromText(String(ev.target?.result ?? ''), resetInput);
    reader.readAsText(file);
  };

  return (
    <>
      <SubViewHeader title="Settings" />
      <div className="container">
        <DesignCard />

        <article className="settings-ex-card" style={{ marginBottom: 20 }}>
          <header className="settings-ex-header"><h4>Display</h4></header>
          <div className="input-group input-group--row">
            <label htmlFor="btnBackPosition">Back button</label>
            <button
              id="btnBackPosition"
              className="cycle-btn"
              type="button"
              onClick={() => toggleBackPosition()}
            >
              {state.global.backPosition === 'bottom' ? 'Bottom' : 'Top'}
            </button>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '10px 0 0' }}>
            Bottom moves the top-left back button into the thumb zone on sub-pages — a floating button in
            the lower-left, or the leftmost slot of the bottom bar when the bottom navigation is also on.
          </p>
          <div className="prompt-pos-field">
            <span className="prompt-pos-label">Prompt position</span>
            <div className="prompt-pos-track">
              <span className="prompt-pos-end">Top</span>
              <input
                type="range" min="0" max="100" step="1" value={state.global.dialogOffset}
                aria-label="Vertical position of pop-up prompts, from top to bottom"
                onChange={(e) => setDialogOffset(e.target.value)}
              />
              <span className="prompt-pos-end">Bottom</span>
            </div>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '10px 0 0' }}>
            Where pop-up prompts (log weight, Today's Workout…) open. Slide toward Bottom to bring them
            into your thumb's reach — they always grow to fit their contents rather than scroll.
          </p>
        </article>

        <article className="settings-ex-card" style={{ marginBottom: 20 }}>
          <header className="settings-ex-header"><h4>Data</h4></header>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0 0 14px' }}>
            Back up your PRs and settings to a file, or restore from a previous export.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-progress"
              type="button"
              style={{ background: 'var(--btn)', border: '1px solid #555', color: '#ccc' }}
              onClick={() => fileRef.current?.click()}
            >
              Import
            </button>
            <button className="btn-progress" type="button" onClick={() => exportSettings()}>Export</button>
          </div>
          <input type="file" ref={fileRef} accept=".json" style={{ display: 'none' }} onChange={onImportFile} />
        </article>

        <details className="settings-advanced">
          <summary className="settings-advanced-summary">
            <span>Exercise &amp; Module Settings</span>
            <span className="settings-advanced-hint">increments, programs, variations, muscles</span>
          </summary>
          <p style={{ color: '#aaa', margin: '14px 0 20px' }}>
            Advanced per-lift options. Expand an exercise to adjust its cycle increment, which programs
            &amp; variations appear in the cycler, and its muscle mapping.
          </p>
          <div id="settingsContainer">
            <article className="settings-ex-card" style={{ marginBottom: 20 }}>
              <header className="settings-ex-header"><h4>Fatigue</h4></header>
              <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0 0 6px' }}>
                How much a working set taxes the secondary muscles a lift trains (e.g. triceps and
                shoulders on bench). 1 = full set, 0.5 = half.
              </p>
              <div className="fatigue-settings-field">
                <label htmlFor="peripheralFactorInput">Peripheral Fatigue Factor:</label>
                <input
                  type="number" inputMode="decimal" id="peripheralFactorInput" min="0" max="1" step="0.05"
                  defaultValue={state.fatigue.peripheralFactor} key={state.fatigue.peripheralFactor}
                  onChange={(e) => updatePeripheralFactor(e.target.value)}
                />
              </div>
              <button className="btn-progress" type="button" onClick={() => setActiveView('fatigueView')}>
                Open Fatigue Manager
              </button>
            </article>
            {state.exercises.map((ex) => <ExerciseSettingsCard key={ex} ex={ex} />)}
          </div>
        </details>

        <article className="settings-ex-card danger-zone" style={{ marginBottom: 20 }}>
          <header className="settings-ex-header"><h4>Factory reset</h4></header>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0 0 14px' }}>
            Erases everything — your lifts, 1RMs, logged weights, PRs, planner, and all settings — and
            restores the app to a fresh install. This cannot be undone.
          </p>
          <button type="button" className="btn-factory-reset" onClick={() => factoryReset()}>
            Reset everything to defaults
          </button>
        </article>
      </div>
    </>
  );
}
