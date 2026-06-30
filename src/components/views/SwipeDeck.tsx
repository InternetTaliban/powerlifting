import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { flushSync } from 'react-dom';
import { useStore } from '../../store/store';
import { getState } from '../../lib/state';
import { switchLift } from '../../store/actions';
import { ProgramContent } from '../program/ProgramContent';
import { rowClickSuppress } from '../program/rowInteract';

// Touch-only "peek" navigation between exercises on the main view: a horizontal
// drag slides the neighbouring program in from the side and snaps to commit on
// release. The prev/active/next programs are pre-rendered in a hidden overlay so a
// drag only sets geometry (no build hitch); a committed switch is a flushSync
// behind the overlay so consecutive swipes have no dead time; scroll position
// carries across proportionally. See TECHNICAL.md "Swipe lift navigation".

const COMMIT_FRACTION = 0.28;   // drag past this fraction of the panel width commits
const FLICK_VELOCITY = 0.5;     // ...or a flick faster than this (px/ms) commits regardless
const AXIS_LOCK = 10;           // travel (px) before we decide horizontal vs vertical
const RESIST = 0.28;            // finger-follow factor at the ends of the list / wrong way
const SNAP_FULL_MS = 230;       // snap duration for a full panel-width of travel
const SNAP_MIN_MS = 120;        // ...floored here so short snaps still read as deliberate

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Height of the opt-in fixed bottom nav, so the overlay stops above it and the
// relative-scroll maths treat it as un-scrollable, like the real page.
function bottomNavInset(): number {
  if (!document.body.classList.contains('nav-bottom')) {
    return 0;
  }
  const nav = document.getElementById('bottomNav');
  return nav ? nav.getBoundingClientRect().height || 0 : 0;
}

interface Drag {
  W: number;
  dir: number;                                   // +1 reveal next, -1 reveal prev
  stageTop: number;
  ratio: number;                                 // 0..1 scroll position carried across
  neighbor: { lift: string; scrolled: number } | null;
  tx: number;
}
interface ReducedSnap { ratio: number; stageTop: number; stageHeight: number; }

export function SwipeDeck({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const state = useStore();
  const { exercises, activeLift } = state;
  const idx = exercises.indexOf(activeLift);
  const prevLift = idx > 0 ? exercises[idx - 1] : null;
  const nextLift = idx >= 0 && idx < exercises.length - 1 ? exercises[idx + 1] : null;

  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Keep the overlay's horizontal geometry (left/width of stage + each slot) in
  // sync with the live program area. Runs after every render (covers a panel
  // being added/removed when exercises change) and on resize via the observer
  // below — so the panels are always laid out at the right width and a drag
  // never has to touch width (which would force a reflow at the worst moment).
  const syncWidths = useCallback(() => {
    const stage = stageRef.current;
    const track = trackRef.current;
    const surface = containerRef.current;
    if (!stage || !track || !surface) {
      return;
    }
    const r = surface.getBoundingClientRect();
    const W = r.width;
    stage.style.left = `${r.left}px`;
    stage.style.width = `${W}px`;
    for (const slot of [-1, 0, 1]) {
      const p = track.querySelector<HTMLElement>(`.swipe-panel[data-slot="${slot}"]`);
      if (p) {
        p.style.left = `${slot * W}px`;
        p.style.width = `${W}px`;
      }
    }
  }, [containerRef]);

  useLayoutEffect(syncWidths);

  useEffect(() => {
    const stage = stageRef.current;
    const track = trackRef.current;
    const surface = containerRef.current;
    if (!stage || !track || !surface) {
      return;
    }

    let disposed = false;
    let active = false;
    let axis: 'x' | 'y' | null = null;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let lastX = 0;
    let lastT = 0;
    let vX = 0;
    let drag: Drag | null = null;
    let reduced: { dir: number; snap: ReducedSnap } | null = null;
    let settleFinish: (() => void) | null = null;
    let settleTimer: number | undefined;

    const panelAt = (slot: number) => track.querySelector<HTMLElement>(`.swipe-panel[data-slot="${slot}"]`);
    const innerOf = (p: HTMLElement | null) => (p?.firstElementChild as HTMLElement | null) ?? null;

    // How far the viewport top sits into the program content, 0..1 of its
    // scrollable range — the quantity carried across a switch.
    const captureRatio = (): ReducedSnap => {
      const r = surface.getBoundingClientRect();
      const stageTop = Math.max(0, r.top);
      const stageHeight = Math.max(0, (window.innerHeight - bottomNavInset()) - stageTop);
      const scrolled = Math.max(0, -Math.min(0, r.top));
      return { ratio: clamp(scrolled / Math.max(1, r.height - stageHeight), 0, 1), stageTop, stageHeight };
    };

    // Land the freshly switched program at the same fraction the old one showed.
    const landAtRatio = (snap: ReducedSnap) => {
      const r = surface.getBoundingClientRect();
      const programTopDoc = r.top + window.scrollY;
      const denom = Math.max(0, r.height - snap.stageHeight);
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const target = snap.ratio >= 0.999 ? maxScroll : programTopDoc + snap.ratio * denom - snap.stageTop;
      window.scrollTo(0, clamp(target, 0, maxScroll));
    };

    const beginPeek = (dir: number): Drag => {
      if (settleFinish) {
        settleFinish();                          // flush a pending snap so we start committed
      }
      const r = surface.getBoundingClientRect();
      const stageTop = Math.max(0, r.top);
      const stageHeight = Math.max(0, (window.innerHeight - bottomNavInset()) - stageTop);
      const W = r.width;
      const curOffset = Math.min(0, r.top - stageTop);   // ≤ 0
      const ratio = clamp(-curOffset / Math.max(1, r.height - stageHeight), 0, 1);

      stage.style.top = `${stageTop}px`;
      stage.style.height = `${stageHeight}px`;
      track.style.transition = 'none';
      track.style.transform = 'translate3d(0,0,0)';

      const cur = innerOf(panelAt(0));
      if (cur) {
        cur.style.transform = `translate3d(0,${curOffset}px,0)`;
      }
      stage.classList.add('active');             // visible now → panels measurable

      let neighbor: Drag['neighbor'] = null;
      const nbPanel = panelAt(dir);
      const nbInner = innerOf(nbPanel);
      if (nbPanel && nbInner) {
        const scrolled = ratio * Math.max(0, nbInner.scrollHeight - stageHeight);
        nbInner.style.transform = `translate3d(0,${-scrolled}px,0)`;
        neighbor = { lift: nbPanel.dataset.lift || '', scrolled };
      }

      // The opaque stage already occludes the real table, so we deliberately do
      // NOT hide #programContainer — that keeps its touchstart firing, which is
      // what lets a fresh swipe interrupt the snap. Latch row-clicks so a stray
      // tap falling through the (pointer-events:none) stage mid-snap can't toggle.
      rowClickSuppress.current = true;
      return { W, dir, stageTop, ratio, neighbor, tx: 0 };
    };

    const updatePeek = (d: Drag) => {
      const revealing = d.dir === 1 ? dx < 0 : dx > 0;
      d.tx = d.neighbor && revealing ? clamp(dx, -d.W, d.W) : dx * RESIST;
      track.style.transform = `translate3d(${d.tx}px,0,0)`;
    };

    const teardownPeek = () => {
      stage.classList.remove('active');
      track.style.transition = '';
      rowClickSuppress.current = false;
    };

    const commitSwitch = (d: Drag) => {
      if (!d.neighbor) {
        return;
      }
      flushSync(() => switchLift(d.neighbor!.lift));   // real table + controls update behind the overlay
      const r = surface.getBoundingClientRect();
      const programTopDoc = r.top + window.scrollY;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const target = d.ratio >= 0.999 ? maxScroll : programTopDoc + d.neighbor.scrolled - d.stageTop;
      window.scrollTo(0, clamp(target, 0, maxScroll));
    };

    // Animate the track to rest, then commit (or not) and lift the overlay.
    const settlePeek = (d: Drag, targetTx: number, commit: boolean) => {
      const dur = Math.max(SNAP_MIN_MS, (Math.abs(targetTx - d.tx) / Math.max(1, d.W)) * SNAP_FULL_MS);
      track.style.transition = `transform ${dur}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
      track.style.transform = `translate3d(${d.tx}px,0,0)`;
      void track.offsetWidth;                    // commit the start value
      track.style.transform = `translate3d(${targetTx}px,0,0)`;

      let done = false;
      const finish = () => {
        if (done || disposed) {
          return;
        }
        done = true;
        settleFinish = null;
        window.clearTimeout(settleTimer);
        if (commit) {
          commitSwitch(d);
        }
        teardownPeek();
      };
      settleFinish = finish;
      track.addEventListener('transitionend', finish, { once: true });
      settleTimer = window.setTimeout(finish, dur + 60);   // transitionend can be skipped
    };

    const finishPeek = (d: Drag) => {
      const revealing = d.dir === 1 ? dx < 0 : dx > 0;
      const flick = d.dir === 1 ? vX < -FLICK_VELOCITY : vX > FLICK_VELOCITY;
      const commit = !!d.neighbor && revealing && (Math.abs(dx) > d.W * COMMIT_FRACTION || flick);
      settlePeek(d, commit ? (d.dir === 1 ? -d.W : d.W) : 0, commit);
    };

    const finishReduced = (r: { dir: number; snap: ReducedSnap }) => {
      const st = getState();
      const i = st.exercises.indexOf(st.activeLift);
      const neighborLift = i === -1 ? undefined : st.exercises[i + r.dir];
      if (!neighborLift) {
        return;
      }
      const revealing = r.dir === 1 ? dx < 0 : dx > 0;
      const flick = r.dir === 1 ? vX < -FLICK_VELOCITY : vX > FLICK_VELOCITY;
      const W = surface.getBoundingClientRect().width || window.innerWidth;
      if (!revealing || (Math.abs(dx) <= W * COMMIT_FRACTION && !flick)) {
        return;
      }
      flushSync(() => switchLift(neighborLift));
      landAtRatio(r.snap);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        active = false;
        return;
      }
      active = true;
      axis = null;
      dx = 0;
      drag = null;
      reduced = null;
      startX = lastX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lastT = e.timeStamp;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 1) {
        return;
      }
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      dx = x - startX;
      const dy = y - startY;

      if (axis === null) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) {
          return;
        }
        if (Math.abs(dx) <= Math.abs(dy)) {
          axis = 'y';
          active = false;
          return;
        }
        axis = 'x';
        const dir = dx < 0 ? 1 : -1;
        if (reduceMotion()) {
          reduced = { dir, snap: captureRatio() };
        } else {
          drag = beginPeek(dir);
        }
      }

      if (axis === 'x') {
        e.preventDefault();                      // we own the gesture: no page scroll / native back-swipe
        const t = e.timeStamp;
        if (t > lastT) {
          vX = (x - lastX) / (t - lastT);
        }
        lastX = x;
        lastT = t;
        if (drag) {
          updatePeek(drag);
        }
      }
    };

    const onTouchEnd = () => {
      if (!active) {
        return;
      }
      active = false;
      if (drag) {
        finishPeek(drag);
        drag = null;
      } else if (reduced) {
        finishReduced(reduced);
        reduced = null;
      }
    };

    const onTouchCancel = () => {
      if (drag) {
        settlePeek(drag, 0, false);
        drag = null;
      }
      active = false;
      reduced = null;
    };

    const ro = new ResizeObserver(syncWidths);
    ro.observe(surface);

    surface.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchCancel);

    return () => {
      disposed = true;
      window.clearTimeout(settleTimer);
      ro.disconnect();
      surface.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      rowClickSuppress.current = false;
      stage.classList.remove('active');
    };
  }, [containerRef, syncWidths]);

  return (
    <div className="swipe-stage" ref={stageRef} aria-hidden="true">
      <div className="swipe-track" ref={trackRef}>
        {prevLift && (
          <div className="swipe-panel" data-slot="-1" data-lift={prevLift}>
            <div className="swipe-panel-inner"><ProgramContent lift={prevLift} interactive={false} /></div>
          </div>
        )}
        <div className="swipe-panel" data-slot="0" data-lift={activeLift}>
          <div className="swipe-panel-inner"><ProgramContent lift={activeLift} interactive={false} /></div>
        </div>
        {nextLift && (
          <div className="swipe-panel" data-slot="1" data-lift={nextLift}>
            <div className="swipe-panel-inner"><ProgramContent lift={nextLift} interactive={false} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
