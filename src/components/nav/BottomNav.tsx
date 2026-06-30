import { useStore, useUI } from '../../store/store';
import { runNavItem, setActiveView, toggleShowHidden } from '../../store/actions';
import { NAV_ITEMS } from '../../lib/nav';
import { todayNavShouldHighlight } from '../../lib/todayStatus';
import { Icon } from '../Icon';
import type { NavKey } from '../../lib/types';

export function BottomNav() {
  const state = useStore();
  const ui = useUI();
  const cfg = state.global.nav;
  const order = cfg.order as NavKey[];
  const highlightToday = todayNavShouldHighlight();
  const hiddenCount = order.filter((k) => cfg.layout[k] === 'hidden').length;
  const reveal = cfg.showHidden && hiddenCount > 0;
  const anyBottom = order.some((k) => cfg.layout[k] === 'bottom');
  const menuReveal = cfg.revealControl === 'menu' && hiddenCount > 0;

  const btn = (k: NavKey, revealed: boolean) => {
    const item = NAV_ITEMS[k];
    const accent = k === 'today' && highlightToday;
    const cls = ['bottom-nav-btn', accent && 'nav-accent', revealed && 'nav-revealed'].filter(Boolean).join(' ');
    const current = item.view && ui.activeView === item.view;
    return (
      <button
        key={k}
        type="button"
        className={cls}
        data-view={item.view}
        aria-current={current ? 'page' : undefined}
        onClick={() => runNavItem(k)}
      >
        <Icon id={item.icon} size={22} />
        <span>{item.short}</span>
      </button>
    );
  };

  return (
    <nav id="bottomNav" className="bottom-nav" aria-label="Views">
      <button
        type="button"
        className="bottom-nav-btn bottom-nav-back"
        title="Back"
        aria-label="Back to main view"
        onClick={() => setActiveView('mainView')}
      >
        <Icon id="icon-chevron-left" size={22} />
        <span>Back</span>
      </button>
      {order.filter((k) => cfg.layout[k] === 'bottom').map((k) => btn(k, false))}
      {anyBottom && reveal
        && order.filter((k) => cfg.layout[k] === 'hidden').map((k) => btn(k, true))}
      {anyBottom && menuReveal && (
        <button
          type="button"
          className={'bottom-nav-btn nav-more' + (cfg.showHidden ? ' nav-more-active' : '')}
          title={cfg.showHidden ? 'Hide extra buttons' : 'Show hidden buttons'}
          aria-label={cfg.showHidden ? 'Hide extra buttons' : 'Show hidden buttons'}
          aria-pressed={cfg.showHidden ? 'true' : 'false'}
          onClick={() => toggleShowHidden()}
        >
          <Icon id="icon-more" size={22} />
          <span>More</span>
        </button>
      )}
    </nav>
  );
}
