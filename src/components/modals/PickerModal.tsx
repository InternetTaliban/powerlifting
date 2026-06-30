import { useState } from 'react';
import { useStore } from '../../store/store';
import { Modal, CloseButton } from '../common/Modal';
import {
  closeModal, openModal, selectProgram, selectVariation, addProgramToLift, addVariationToLift,
  toggleProgramAccess, toggleVariationAccess,
} from '../../store/actions';
import { regularPrograms, pullupPrograms } from '../../lib/data';
import { getProgramName, customProgramKeys } from '../../lib/programLookup';
import { Icon } from '../Icon';
import { MuscleTargetEditor } from '../views/MuscleTargetEditor';
import type { MuscleMapEntry } from '../../lib/types';

function PickerOpt({ label, current, onClick, onHide }: {
  label: string; current: boolean; onClick: () => void; onHide?: () => void;
}) {
  return (
    <button
      type="button"
      className={'picker-opt' + (current ? ' selected' : '')}
      aria-current={current ? 'true' : undefined}
      onClick={onClick}
    >
      <span className="picker-opt-label">{label}</span>
      <span className="picker-opt-check" aria-hidden="true">{current ? '✓' : ''}</span>
      {onHide && (
        <span
          className="picker-opt-hide"
          role="button"
          tabIndex={0}
          title="Hide from picker"
          aria-label={`Hide ${label}`}
          onClick={(e) => { e.stopPropagation(); onHide(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onHide();
            }
          }}
        >
          <Icon id="icon-ban" size={17} />
        </span>
      )}
    </button>
  );
}

function AddOptButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="picker-opt picker-opt--add" onClick={onClick}>
      <span className="picker-opt-add-icon" aria-hidden="true">+</span>
      <span className="picker-opt-label">{label}</span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="picker-back" onClick={onClick}>← Back</button>;
}

export function ProgramPickerModal() {
  const state = useStore();
  const lift = state.activeLift;
  const current = state.lifts[lift].program;
  const allowed = state.allowedPrograms[lift] || [];
  const catalog = [...(lift === 'pullup' ? pullupPrograms : regularPrograms), ...customProgramKeys()];
  const addable = catalog.filter((progKey) => !allowed.includes(progKey));
  const [adding, setAdding] = useState(false);

  return (
    <Modal id="programPickerModal">
      <CloseButton onClick={() => closeModal()} />
      <h3>{adding ? 'Add Program' : 'Program Type'}</h3>
      {adding ? (
        <>
          <div className="picker-list">
            {addable.map((progKey) => (
              <PickerOpt
                key={progKey}
                label={getProgramName(progKey)}
                current={false}
                onClick={() => addProgramToLift(progKey)}
              />
            ))}
            {addable.length === 0 && (
              <p className="picker-empty">All your programs are already in this list.</p>
            )}
            <button type="button" className="picker-opt picker-opt--add" onClick={() => openModal('programBuilder')}>
              <span className="picker-opt-add-icon" aria-hidden="true">✏️</span>
              <span className="picker-opt-label">Create custom program</span>
            </button>
          </div>
          <BackButton onClick={() => setAdding(false)} />
        </>
      ) : (
        <div className="picker-list">
          {allowed.map((progKey) => (
            <PickerOpt
              key={progKey}
              label={getProgramName(progKey)}
              current={progKey === current}
              onClick={() => selectProgram(progKey)}
              onHide={() => toggleProgramAccess(lift, progKey, false)}
            />
          ))}
          <AddOptButton label="Add program" onClick={() => setAdding(true)} />
        </div>
      )}
    </Modal>
  );
}

export function VariationPickerModal() {
  const state = useStore();
  const lift = state.activeLift;
  const current = state.lifts[lift].variation;
  const allowed = state.allowedVariations[lift] || [];
  const names = state.variationsDict[lift] || [];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [showMuscles, setShowMuscles] = useState(false);
  const [muscleMap, setMuscleMap] = useState<MuscleMapEntry>({ primary: [], secondary: [] });

  const resetForm = () => {
    setName('');
    setMuscleMap({ primary: [], secondary: [] });
    setShowMuscles(false);
  };

  const submit = () => {
    if (addVariationToLift(name, muscleMap)) {
      resetForm();
    }
  };

  const toggleMuscle = (muscle: string, role: 'primary' | 'secondary', enabled: boolean) => {
    setMuscleMap((prev) => {
      const next = { primary: [...prev.primary], secondary: [...prev.secondary] };
      const other = role === 'primary' ? 'secondary' : 'primary';
      if (!enabled) {
        next[role] = next[role].filter((m) => m !== muscle);
      } else {
        if (!next[role].includes(muscle)) {
          next[role].push(muscle);
        }
        next[other] = next[other].filter((m) => m !== muscle);
      }
      return next;
    });
  };

  return (
    <Modal id="variationPickerModal">
      <CloseButton onClick={() => closeModal()} />
      <h3>{adding ? 'Add Variation' : 'Backoff Variation'}</h3>
      {adding ? (
        <>
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label htmlFor="newVariationName">Variation Name</label>
            <input
              type="text"
              id="newVariationName"
              style={{ width: '100%' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              autoFocus
            />
          </div>

          <button
            type="button"
            className="picker-disclosure"
            aria-expanded={showMuscles}
            onClick={() => setShowMuscles((v) => !v)}
          >
            {showMuscles ? '▾' : '▸'} Select targeted muscles
          </button>
          {showMuscles
            ? <MuscleTargetEditor map={muscleMap} onToggle={toggleMuscle} />
            : <p className="picker-hint">Leave unset to inherit the main exercise's muscles.</p>}

          <button className="btn-progress" type="button" onClick={submit}>Add Variation</button>
          <BackButton onClick={() => { setAdding(false); resetForm(); }} />
        </>
      ) : (
        <div className="picker-list">
          {allowed.map((idx) => (
            <PickerOpt
              key={idx}
              label={names[idx] || `Variation ${idx + 1}`}
              current={idx === current}
              onClick={() => selectVariation(idx)}
              onHide={() => toggleVariationAccess(lift, idx, false)}
            />
          ))}
          <AddOptButton label="Add variation" onClick={() => setAdding(true)} />
        </div>
      )}
    </Modal>
  );
}
