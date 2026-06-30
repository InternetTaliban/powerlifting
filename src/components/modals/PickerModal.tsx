import { useStore } from '../../store/store';
import { Modal, CloseButton } from '../common/Modal';
import { closeModal, selectProgram, selectVariation } from '../../store/actions';
import { programsDict } from '../../lib/data';

interface Option { value: number; label: string; current: boolean; }

function Picker({ id, title, options, onPick }: {
  id: string; title: string; options: Option[]; onPick: (v: number) => void;
}) {
  return (
    <Modal id={id}>
      <CloseButton onClick={() => closeModal()} />
      <h3>{title}</h3>
      <div className="picker-list">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={'picker-opt' + (opt.current ? ' selected' : '')}
            aria-current={opt.current ? 'true' : undefined}
            onClick={() => onPick(opt.value)}
          >
            <span className="picker-opt-label">{opt.label}</span>
            <span className="picker-opt-check" aria-hidden="true">{opt.current ? '✓' : ''}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function ProgramPickerModal() {
  const state = useStore();
  const lift = state.activeLift;
  const current = state.lifts[lift].program;
  const allowed = state.allowedPrograms[lift] || [];
  return (
    <Modal id="programPickerModal">
      <CloseButton onClick={() => closeModal()} />
      <h3>Program Type</h3>
      <div className="picker-list">
        {allowed.map((progKey) => (
          <button
            key={progKey}
            type="button"
            className={'picker-opt' + (progKey === current ? ' selected' : '')}
            aria-current={progKey === current ? 'true' : undefined}
            onClick={() => selectProgram(progKey)}
          >
            <span className="picker-opt-label">{programsDict[progKey] || progKey}</span>
            <span className="picker-opt-check" aria-hidden="true">{progKey === current ? '✓' : ''}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function VariationPickerModal() {
  const state = useStore();
  const lift = state.activeLift;
  const current = state.lifts[lift].variation;
  const allowed = state.allowedVariations[lift] || [];
  const names = state.variationsDict[lift] || [];
  const options: Option[] = allowed.map((idx) => ({
    value: idx,
    label: names[idx] || `Variation ${idx + 1}`,
    current: idx === current,
  }));
  return <Picker id="variationPickerModal" title="Backoff Variation" options={options} onPick={selectVariation} />;
}
