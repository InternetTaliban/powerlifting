import { useUI } from '../../store/store';
import { ProgramPickerModal, VariationPickerModal } from './PickerModal';
import { AddExerciseModal, EditExerciseModal, CustomWorkoutModal } from './ExerciseModals';
import { WarmupModal } from './WarmupModal';
import { LogWeightModal } from './LogWeightModal';
import { LogWorkoutModal } from './LogWorkoutModal';
import { TodayModal } from './TodayModal';
import { ProgramBuilderModal } from './ProgramBuilderModal';
import type { ModalState } from '../../store/store';

function render(modal: ModalState) {
  const p = modal.props || {};
  switch (modal.type) {
    case 'programPicker': return <ProgramPickerModal />;
    case 'variationPicker': return <VariationPickerModal />;
    case 'addExercise': return <AddExerciseModal />;
    case 'editExercise': return <EditExerciseModal ex={p.ex as string} />;
    case 'customWorkout': return <CustomWorkoutModal />;
    case 'warmup': return <WarmupModal />;
    case 'logWeight':
      return (
        <LogWeightModal
          rowId={p.rowId as string}
          lift={p.lift as string}
          program={p.program as string}
          w={p.w as number}
          d={p.d as number}
        />
      );
    case 'logWorkout':
      return (
        <LogWorkoutModal
          context={p.context as 'planner' | 'backlog'}
          date={p.date as string}
          markDone={p.markDone as boolean}
        />
      );
    case 'today': return <TodayModal />;
    case 'programBuilder': return <ProgramBuilderModal editKey={p.editKey as string | undefined} />;
    default: return null;
  }
}

export function ModalHost() {
  const ui = useUI();
  return <>{ui.modals.map((m, i) => <div key={`${m.type}-${i}`}>{render(m)}</div>)}</>;
}
