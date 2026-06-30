import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useStore, useUI } from '../../store/store';
import { useScrollY } from '../../hooks/useScrollY';
import { setActiveView, openModal } from '../../store/actions';
import { scrollToTop, scrollToActiveWeek, snappyScrollTo } from '../../util/scroll';
import { todayFabEligible } from '../../lib/todayStatus';
import { Icon } from '../Icon';

const SCROLL_TOP_THRESHOLD_PX = 300;
const NEAR_TOP_FRACTION = 0.15;

function gotoTrainingEligible(activeView: string): boolean {
  if (activeView !== 'mainView') {
    return false;
  }
  const container = document.getElementById('programContainer');
  const uncompleted = container?.querySelector('.week-card tbody tr:not(.completed)');
  const card = uncompleted?.closest('.week-card');
  if (!card) {
    return false;
  }
  const rect = card.getBoundingClientRect();
  return rect.top > window.innerHeight || rect.bottom < 0;
}

export function Fabs() {
  const state = useStore();
  const ui = useUI();
  const y = useScrollY();
  const priority = useRef<'goto' | 'top'>('goto');
  const lastY = useRef(0);

  const fabs = state.global.nav.fabs;
  const scrollHeight = typeof document !== 'undefined' ? document.documentElement.scrollHeight : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const max = scrollHeight - viewportHeight;
  if (y < lastY.current && (max <= 0 || y <= max * NEAR_TOP_FRACTION)) {
    priority.current = 'goto';
  }
  lastY.current = y;

  const topEligible = fabs.scrollTop !== false && y > SCROLL_TOP_THRESHOLD_PX;
  const gotoEligible = fabs.goToTraining !== false && gotoTrainingEligible(ui.activeView);
  let show: 'none' | 'top' | 'goto' = 'none';
  if (topEligible && gotoEligible) {
    show = priority.current === 'top' ? 'top' : 'goto';
  } else if (topEligible) {
    show = 'top';
  } else if (gotoEligible) {
    show = 'goto';
  }

  const onGoToTraining = () => {
    priority.current = 'top';
    scrollToActiveWeek();
  };

  const isSubview = ui.activeView !== 'mainView';
  const todayFab = todayFabEligible() && !isSubview;
  const backBottom = state.global.backPosition === 'bottom';
  const navBottom = state.global.nav.order.some((k) => state.global.nav.layout[k] === 'bottom');
  const showBackFab = backBottom && isSubview && !navBottom;

  // Fade a FAB (.over-recalc → opacity 0.4) only while it physically overlaps an
  // on-screen action button like Complete Block, so the button's label stays
  // readable. Re-checked every render (which tracks the scroll-driven re-renders
  // from useScrollY) and on resize. Toggled imperatively — React owns these
  // buttons' display, not their className, so it won't fight us.
  const syncFabOverlap = useCallback(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.btn-progress'))
      .filter((el) => el.offsetParent !== null && !el.closest('dialog'));
    for (const fabId of ['scrollTopBtn', 'goToTrainingBtn', 'todayFab']) {
      const fab = document.getElementById(fabId);
      if (!fab) {
        continue;
      }
      if (fab.style.display === 'none') {
        fab.classList.remove('over-recalc');
        continue;
      }
      const a = fab.getBoundingClientRect();
      const overlaps = targets.some((el) => {
        const b = el.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
      fab.classList.toggle('over-recalc', overlaps);
    }
  }, []);

  useLayoutEffect(syncFabOverlap);

  useEffect(() => {
    window.addEventListener('resize', syncFabOverlap);
    return () => window.removeEventListener('resize', syncFabOverlap);
  }, [syncFabOverlap]);

  return (
    <>
      <button
        id="scrollTopBtn"
        type="button"
        onClick={() => scrollToTop()}
        title="Scroll to top"
        aria-label="Scroll to top"
        style={{ display: show === 'top' ? 'flex' : 'none' }}
      >
        <Icon id="icon-arrow-up" size={24} />
      </button>

      <button
        id="goToTrainingBtn"
        type="button"
        onClick={onGoToTraining}
        title="Go to your training"
        aria-label="Go to your training"
        style={{ display: show === 'goto' ? 'flex' : 'none' }}
      >
        <Icon id="icon-arrow-down" size={24} />
      </button>

      <button
        id="backFab"
        type="button"
        onClick={() => setActiveView('mainView')}
        title="Back"
        aria-label="Back to main view"
        style={{ display: showBackFab ? 'flex' : 'none' }}
      >
        <Icon id="icon-chevron-left" size={24} />
      </button>

      <button
        id="todayFab"
        type="button"
        onClick={() => openModal('today')}
        title="Today's Workout"
        aria-label="Open today's workout"
        style={{ display: todayFab ? 'flex' : 'none' }}
      >
        <Icon id="icon-today" size={22} />
        <span>Today's Workout</span>
      </button>
    </>
  );
}

export { snappyScrollTo };
