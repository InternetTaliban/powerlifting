import { useState } from 'react';
import { useStore } from '../../store/store';
import { Modal, CloseButton } from '../common/Modal';
import { closeModal, saveNewExercise, saveEditExercise, saveCustomWorkout } from '../../store/actions';

export function AddExerciseModal() {
  const [name, setName] = useState('');
  const [vars, setVars] = useState('');
  return (
    <Modal id="addExModal">
      <CloseButton onClick={() => closeModal()} />
      <h3>Add New Exercise</h3>
      <div className="input-group" style={{ marginBottom: 16 }}>
        <label htmlFor="newExName">Exercise Name</label>
        <input
          type="text"
          id="newExName"
          style={{ width: '100%' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="input-group" style={{ marginBottom: 16 }}>
        <label htmlFor="newExVars">
          Backoff Variations <small style={{ fontWeight: 'normal', textTransform: 'none' }}>(comma separated)</small>
        </label>
        <input
          type="text"
          id="newExVars"
          style={{ width: '100%' }}
          value={vars}
          onChange={(e) => setVars(e.target.value)}
        />
      </div>
      <button className="btn-progress" type="button" onClick={() => saveNewExercise(name, vars)}>Add Exercise</button>
    </Modal>
  );
}

export function EditExerciseModal({ ex }: { ex: string }) {
  const state = useStore();
  const [name, setName] = useState(ex);
  const [vars, setVars] = useState((state.variationsDict[ex] || []).join(', '));
  return (
    <Modal id="editExModal">
      <CloseButton onClick={() => closeModal()} />
      <h3>Edit Exercise</h3>
      <div className="input-group" style={{ marginBottom: 16 }}>
        <label htmlFor="editExName">Exercise Name</label>
        <input
          type="text"
          id="editExName"
          style={{ width: '100%' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="input-group" style={{ marginBottom: 16 }}>
        <label htmlFor="editExVars">
          Backoff Variations <small style={{ fontWeight: 'normal', textTransform: 'none' }}>(comma separated)</small>
        </label>
        <input
          type="text"
          id="editExVars"
          style={{ width: '100%' }}
          value={vars}
          onChange={(e) => setVars(e.target.value)}
        />
      </div>
      <button
        className="btn-progress"
        type="button"
        onClick={() => saveEditExercise(ex, name, vars)}
      >
        Save Changes
      </button>
    </Modal>
  );
}

export function CustomWorkoutModal() {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const onAdd = () => {
    if (saveCustomWorkout(name, note)) {
      closeModal();
    }
  };

  return (
    <Modal id="customWorkoutModal">
      <CloseButton onClick={() => closeModal()} />
      <h3>Add Custom Workout</h3>
      <div className="input-group" style={{ marginBottom: 16 }}>
        <label htmlFor="customWorkoutName">Workout Name</label>
        <input
          type="text"
          id="customWorkoutName"
          maxLength={60}
          placeholder="e.g. Conditioning — 20 min row"
          style={{ width: '100%' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="input-group" style={{ marginBottom: 16 }}>
        <label htmlFor="customWorkoutNote">
          Note <small style={{ fontWeight: 'normal', textTransform: 'none' }}>(optional)</small>
        </label>
        <textarea
          id="customWorkoutNote"
          rows={3}
          maxLength={280}
          placeholder="Sets, reps, accessories — anything you want to remember."
          style={{ width: '100%' }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button className="btn-progress" type="button" onClick={onAdd}>Add to Planner</button>
    </Modal>
  );
}
