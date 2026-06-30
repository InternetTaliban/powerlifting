import { useStore, useUI } from '../../store/store';
import { runNavItem, toggleShowHidden } from '../../store/actions';
import { NAV_ITEMS } from '../../lib/nav';
import { todayNavShouldHighlight } from '../../lib/todayStatus';
import { Icon } from '../Icon';
import type { NavKey } from '../../lib/types';

export function TopNav() {
  const state = useStore();
  useUI();
  const cfg = state.global.nav;
  const order = cfg.order as NavKey[];
  const highlightToday = todayNavShouldHighlight();
  const hiddenCount = order.filter((k) => cfg.layout[k] === 'hidden').length;
  const reveal = cfg.showHidden && hiddenCount > 0;
  const menuReveal = cfg.revealControl === 'menu' && hiddenCount > 0;

  const btn = (k: NavKey, revealed: boolean) => {
    const item = NAV_ITEMS[k];
    const accent = k === 'today' && highlightToday;
    const cls = ['icon-btn', accent && 'nav-accent', revealed && 'nav-revealed'].filter(Boolean).join(' ');
    return (
      <button
        key={k}
        type="button"
        className={cls}
        title={item.label}
        aria-label={item.label}
        onClick={() => runNavItem(k)}
      >
        <Icon id={item.icon} size={22} />
      </button>
    );
  };

  return (
    <nav className="nav-icons" id="topNav" aria-label="Views">
      {order.filter((k) => cfg.layout[k] === 'top').map((k) => btn(k, false))}
      {reveal && order.filter((k) => cfg.layout[k] === 'hidden').map((k) => btn(k, true))}
      {menuReveal && (
        <button
          type="button"
          className={'icon-btn nav-more' + (cfg.showHidden ? ' nav-more-active' : '')}
          title={cfg.showHidden ? 'Hide extra buttons' : 'Show hidden buttons'}
          aria-label={cfg.showHidden ? 'Hide extra buttons' : 'Show hidden buttons'}
          aria-pressed={cfg.showHidden ? 'true' : 'false'}
          onClick={() => toggleShowHidden()}
        >
          <Icon id="icon-more" size={22} />
        </button>
      )}
    </nav>
  );
}
