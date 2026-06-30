import { useEffect } from 'react';
import type { RefObject } from 'react';
import { openModal } from '../store/actions';
import { rowClickSuppress } from '../components/program/rowInteract';

const LONG_PRESS_MS = 500;
// Travel past this (px) means the finger is swiping, not holding — so the press
// (and the menu the browser raises from it) is for the swipe nav, not a log. Same
// budget as the swipe's own axis-lock, so the two hand off cleanly.
const MOVE_TOLERANCE = 10;

export function useLongPress(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    let holdTimer: number | undefined;
    let holdTr: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let moved = false;

    const openFor = (tr: HTMLElement) => {
      openModal('logWeight', {
        rowId: tr.dataset.rowId,
        lift: tr.dataset.lift,
        program: tr.dataset.program,
        w: parseInt(tr.dataset.w || '', 10),
        d: parseInt(tr.dataset.d || '', 10),
      });
    };

    const start = (target: EventTarget | null, x: number, y: number) => {
      const tr = (target as HTMLElement | null)?.closest('tr[data-row-id]') as HTMLElement | null;
      if (!tr || !tr.dataset.program) {
        return;
      }
      holdTr = tr;
      startX = x;
      startY = y;
      moved = false;
      tr.classList.add('holding');
      holdTimer = window.setTimeout(() => {
        rowClickSuppress.current = true;
        tr.classList.remove('holding');
        holdTr = null;
        openFor(tr);
      }, LONG_PRESS_MS);
    };

    const cancel = () => {
      clearTimeout(holdTimer);
      if (holdTr) {
        holdTr.classList.remove('holding');
        holdTr = null;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        start(e.target, touch.clientX, touch.clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && (Math.abs(touch.clientX - startX) > MOVE_TOLERANCE || Math.abs(touch.clientY - startY) > MOVE_TOLERANCE)) {
        moved = true;
      }
      cancel();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        start(e.target, e.clientX, e.clientY);
      }
    };
    const onContext = (e: MouseEvent) => {
      const tr = (e.target as HTMLElement).closest('tr[data-row-id]') as HTMLElement | null;
      if (!tr || !tr.dataset.program) {
        return;
      }
      e.preventDefault();
      cancel();
      // A moved finger is a swipe between exercises, not a long-press — the browser
      // still raised contextmenu, but we swallow it instead of opening Log Weight.
      if (moved) {
        moved = false;
        return;
      }
      openFor(tr);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', cancel);
    container.addEventListener('touchcancel', cancel);
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', cancel);
    container.addEventListener('mouseleave', cancel);
    container.addEventListener('contextmenu', onContext);

    return () => {
      cancel();
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', cancel);
      container.removeEventListener('touchcancel', cancel);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', cancel);
      container.removeEventListener('mouseleave', cancel);
      container.removeEventListener('contextmenu', onContext);
    };
  }, [ref]);
}
