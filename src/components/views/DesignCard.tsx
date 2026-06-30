import { useStore } from '../../store/store';
import { NAV_ITEMS, CONTROL_ITEMS } from '../../lib/nav';
import {
  setNavLayout, moveNavButton, setRevealControl, toggleShowHidden, toggleFab,
  setControlLayout, moveControl, applyThumbReachPreset, resetNavDesign,
} from '../../store/actions';
import { Icon } from '../Icon';
import type { NavKey, NavLocation } from '../../lib/types';

function MoveButtons({ label, idx, total, move }: {
  label: string; idx: number; total: number; move: (dir: number) => void;
}) {
  return (
    <div className="design-moves">
      <button
        type="button"
        className="icon-btn design-move"
        title="Move up"
        aria-label={`Move ${label} up`}
        disabled={idx === 0}
        onClick={() => move(-1)}
      >
        <Icon id="icon-arrow-up" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn design-move"
        title="Move down"
        aria-label={`Move ${label} down`}
        disabled={idx === total - 1}
        onClick={() => move(1)}
      >
        <Icon id="icon-arrow-down" size={16} />
      </button>
    </div>
  );
}

export function DesignCard() {
  const state = useStore();
  const cfg = state.global.nav;
  const ctrl = state.global.controls;
  const hiddenCount = cfg.order.filter((k) => cfg.layout[k] === 'hidden').length;

  return (
    <article className="settings-ex-card design-card" style={{ marginBottom: 20 }}>
      <header className="settings-ex-header"><h4>Design</h4></header>
      <p className="design-intro">
        Customize your navigation. Send each button to the top bar or the bottom bar, hide the ones you
        don't use, and reorder them with the arrows. Settings can be moved but never hidden.
      </p>

      <div id="designButtonsList" className="design-list">
        {(cfg.order as NavKey[]).map((key, idx) => {
          const item = NAV_ITEMS[key];
          const locs: [NavLocation, string][] = item.essential
            ? [['top', 'Top'], ['bottom', 'Bottom']]
            : [['top', 'Top'], ['bottom', 'Bottom'], ['hidden', 'Hidden']];
          return (
            <div className="design-row" key={key}>
              <div className="design-row-main">
                <MoveButtons
                  label={item.label}
                  idx={idx}
                  total={cfg.order.length}
                  move={(dir) => moveNavButton(key, dir)}
                />
                <span className="design-row-icon"><Icon id={item.icon} size={20} /></span>
                <span className="design-row-label">{item.label}</span>
              </div>
              <div className="design-seg" role="group" aria-label={`Placement for ${item.label}`}>
                {locs.map(([loc, text]) => (
                  <button
                    key={loc}
                    type="button"
                    className={'design-seg-opt' + (cfg.layout[key] === loc ? ' selected' : '')}
                    aria-current={cfg.layout[key] === loc ? 'true' : undefined}
                    onClick={() => setNavLayout(key, loc)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <section className="design-section">
        <h5 className="design-section-title">Hidden buttons</h5>
        <div className="input-group input-group--row">
          <label id="revealControlLabel">&ldquo;Show hidden&rdquo; control</label>
          <div className="design-seg" role="group" aria-labelledby="revealControlLabel">
            <button
              type="button"
              className={'design-seg-opt' + (cfg.revealControl === 'settings' ? ' selected' : '')}
              onClick={() => setRevealControl('settings')}
            >
              In Settings
            </button>
            <button
              type="button"
              className={'design-seg-opt' + (cfg.revealControl === 'menu' ? ' selected' : '')}
              onClick={() => setRevealControl('menu')}
            >
              In nav (&middot;&middot;&middot;)
            </button>
          </div>
        </div>
        <div
          className="input-group input-group--row"
          id="showHiddenRow"
          style={{ marginTop: 14, opacity: hiddenCount === 0 ? 0.5 : 1 }}
        >
          <label htmlFor="btnShowHidden">Show hidden buttons</label>
          <button
            type="button"
            className="cycle-btn"
            id="btnShowHidden"
            aria-pressed={cfg.showHidden ? 'true' : 'false'}
            disabled={hiddenCount === 0}
            onClick={() => toggleShowHidden()}
          >
            {cfg.showHidden ? 'On' : 'Off'}
          </button>
        </div>
        <p className="design-hint" id="designRevealHint">
          {hiddenCount === 0
            ? 'No buttons are hidden right now.'
            : cfg.revealControl === 'menu'
              ? 'A ⋯ button in the navigation reveals hidden buttons.'
              : ''}
        </p>
      </section>

      <details className="design-section design-subsection">
        <summary className="design-section-title design-subsection-summary">
          <span>Floating buttons</span>
          <span className="design-subsection-hint">Today, scroll-to-top, go-to-training</span>
        </summary>
        <div className="input-group input-group--row" style={{ marginTop: 6 }}>
          <label htmlFor="btnFabToday">Today's Workout button</label>
          <button
            type="button"
            className="cycle-btn"
            id="btnFabToday"
            aria-pressed={cfg.fabs.today ? 'true' : 'false'}
            onClick={() => toggleFab('today')}
          >
            {cfg.fabs.today ? 'On' : 'Off'}
          </button>
        </div>
        <p className="design-hint">
          Shows Today's Workout as a button in the middle of the bottom while you still have planner
          workouts left for the day. Once they're all done it moves back to the navigation.
        </p>
        <div className="input-group input-group--row" style={{ marginTop: 14 }}>
          <label htmlFor="btnFabScrollTop">Scroll-to-top button</label>
          <button
            type="button"
            className="cycle-btn"
            id="btnFabScrollTop"
            aria-pressed={cfg.fabs.scrollTop ? 'true' : 'false'}
            onClick={() => toggleFab('scrollTop')}
          >
            {cfg.fabs.scrollTop ? 'On' : 'Off'}
          </button>
        </div>
        <div className="input-group input-group--row" style={{ marginTop: 14 }}>
          <label htmlFor="btnFabGoToTraining">Go-to-training button</label>
          <button
            type="button"
            className="cycle-btn"
            id="btnFabGoToTraining"
            aria-pressed={cfg.fabs.goToTraining ? 'true' : 'false'}
            onClick={() => toggleFab('goToTraining')}
          >
            {cfg.fabs.goToTraining ? 'On' : 'Off'}
          </button>
        </div>
      </details>

      <details className="design-section design-subsection">
        <summary className="design-section-title design-subsection-summary">
          <span>Lift controls</span>
          <span className="design-subsection-hint">order &amp; hide the main-page controls</span>
        </summary>
        <p className="design-hint">
          Reorder the controls under the exercise tabs on the main page, or hide the ones you don't use.
        </p>
        <div id="controlsDesignList" className="design-list" style={{ marginTop: 10 }}>
          {ctrl.order.map((key, idx) => {
            const item = CONTROL_ITEMS[key];
            return (
              <div className="design-row" key={key}>
                <div className="design-row-main">
                  <MoveButtons
                    label={item.label}
                    idx={idx}
                    total={ctrl.order.length}
                    move={(dir) => moveControl(key, dir)}
                  />
                  <span className="design-row-label">{item.label}</span>
                </div>
                <div className="design-seg" role="group" aria-label={`Visibility for ${item.label}`}>
                  {(['show', 'hidden'] as const).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      className={'design-seg-opt' + (ctrl.layout[key] === loc ? ' selected' : '')}
                      aria-current={ctrl.layout[key] === loc ? 'true' : undefined}
                      onClick={() => setControlLayout(key, loc)}
                    >
                      {loc === 'show' ? 'Show' : 'Hidden'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </details>

      <div className="design-actions">
        <button
          type="button"
          className="design-action-btn design-action-primary"
          onClick={() => applyThumbReachPreset()}
        >
          Thumb reach (all to bottom)
        </button>
        <button
          type="button"
          className="design-action-btn design-action-reset"
          onClick={() => resetNavDesign()}
        >
          Reset layout
        </button>
      </div>
    </article>
  );
}
