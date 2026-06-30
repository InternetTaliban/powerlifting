import { useRef } from 'react';
import { useStore } from '../../store/store';
import { SubViewHeader } from './SubViewHeader';
import { DesignCard } from './DesignCard';
import { ExerciseSettingsCard } from './ExerciseSettingsCard';
import { Icon } from '../Icon';
import { ensureFatigueState } from '../../lib/fatigue';
import {
  toggleBackPosition, toggleAlwaysShowBack, setDialogOffset, exportSettings, importStateFromText,
  factoryReset, resetSettings, updatePeripheralFactor, setActiveView, openModal, deleteCustomProgram,
} from '../../store/actions';

export function SettingsView() {
  const state = useStore();
  ensureFatigueState();
  const customPrograms = Object.entries(state.customPrograms || {});
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
          <div className="input-group input-group--row" style={{ marginTop: 16 }}>
            <label htmlFor="btnAlwaysShowBack">Always show back button</label>
            <button
              id="btnAlwaysShowBack"
              className="cycle-btn"
              type="button"
              aria-pressed={state.global.alwaysShowBack ? 'true' : 'false'}
              onClick={() => toggleAlwaysShowBack()}
            >
              {state.global.alwaysShowBack ? 'On' : 'Off'}
            </button>
          </div>
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
        </article>

        <details className="settings-advanced" style={{ marginBottom: 20 }}>
          <summary className="settings-advanced-summary">
            <span>Exercise &amp; Module Settings</span>
            <span className="settings-advanced-hint">increments, programs, variations, muscles</span>
          </summary>
          <p style={{ color: '#aaa', margin: '14px 0 20px' }}>Expand an exercise to adjust its options.</p>
          <div id="settingsContainer">
            <article className="settings-ex-card" style={{ marginBottom: 20 }}>
              <header className="settings-ex-header"><h4>Fatigue</h4></header>
              <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0 0 6px' }}>
                Secondary-muscle tax per working set (1 = full, 0.5 = half).
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
            <article className="settings-ex-card" style={{ marginBottom: 20 }}>
              <header className="settings-ex-header"><h4>Custom Programs</h4></header>
              <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0 0 12px' }}>
                Build your own programs and use them on any lift.
              </p>
              {customPrograms.length === 0 ? (
                <p style={{ color: '#888', margin: '0 0 12px' }}>No custom programs yet.</p>
              ) : (
                <div className="settings-cp-list">
                  {customPrograms.map(([key, cp]) => (
                    <div className="settings-cp-row" key={key}>
                      <span className="settings-cp-name">{cp.name}</span>
                      <div className="settings-actions">
                        <button
                          className="icon-btn" type="button" title="Edit"
                          onClick={() => openModal('programBuilder', { editKey: key })}
                        ><Icon id="icon-edit" size={18} /></button>
                        <button
                          className="icon-btn icon-btn--danger" type="button" title="Delete"
                          onClick={() => deleteCustomProgram(key)}
                        ><Icon id="icon-trash" size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn-progress" type="button" onClick={() => openModal('programBuilder')}>
                Create Program
              </button>
            </article>
            {state.exercises.map((ex) => <ExerciseSettingsCard key={ex} ex={ex} />)}
          </div>
        </details>

        <article className="settings-ex-card" style={{ marginBottom: 20 }}>
          <header className="settings-ex-header"><h4>Data</h4></header>
          <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0 0 14px' }}>Back up or restore your data.</p>
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

        <div className="settings-reset-actions">
          <button type="button" className="btn-factory-reset" onClick={() => resetSettings()}>Reset settings</button>
          <button type="button" className="btn-factory-reset" onClick={() => factoryReset()}>Factory reset</button>
        </div>
      </div>
    </>
  );
}
