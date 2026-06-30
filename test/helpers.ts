import { setState, initState } from '../src/lib/state';
import type { State } from '../src/lib/types';

export const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function setLoose(s: unknown): void {
  setState(s as State);
}

export function loadWith(seed: Record<string, string>): State {
  localStorage.clear();
  for (const k of Object.keys(seed)) {
    localStorage.setItem(k, seed[k]);
  }
  return initState();
}
