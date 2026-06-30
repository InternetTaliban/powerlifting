import { useSyncExternalStore } from 'react';
import { getState, saveState } from '../lib/state';
import type { ImportIssue, State, ViewId } from '../lib/types';

export type ModalType =
  | 'warmup' | 'programPicker' | 'variationPicker' | 'addExercise' | 'editExercise'
  | 'logWeight' | 'customWorkout' | 'logWorkout' | 'today';

export interface ModalState { type: ModalType; props?: Record<string, unknown>; }
export interface ConfirmState {
  message: string;
  onConfirm: () => void;
  danger: boolean;
  confirmLabel?: string;
  details?: ImportIssue[];
}
export interface AlertState { message: string; onOk?: () => void; }
export interface ToastState { message: string; key: number; }

export interface UI {
  activeView: ViewId;
  modals: ModalState[];
  toast: ToastState | null;
  confirm: ConfirmState | null;
  alert: AlertState | null;
  platesWeekIndex: number;
  repAdjustersOpen: boolean;
}

export const ui: UI = {
  activeView: 'mainView',
  modals: [],
  toast: null,
  confirm: null,
  alert: null,
  platesWeekIndex: 0,
  repAdjustersOpen: false,
};

let version = 0;
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): number {
  return version;
}

function emit(): void {
  version++;
  listeners.forEach((listener) => listener());
}

export function commit(): void {
  saveState();
  emit();
}

export function touch(): void {
  emit();
}

export function useStore(): State {
  useSyncExternalStore(subscribe, getSnapshot);
  return getState();
}

export function useUI(): UI {
  useSyncExternalStore(subscribe, getSnapshot);
  return ui;
}
