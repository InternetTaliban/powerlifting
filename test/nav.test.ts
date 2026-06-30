import { test } from 'vitest';
import assert from 'node:assert/strict';
import { normalizeState } from '../src/lib/state';
import { NAV_KEYS, CONTROL_KEYS, defaultState } from '../src/lib/data';
import { plain, loadWith } from './helpers';


test('normalizeState: seeds the curated default nav layout (Today/PO Box top, everyday bottom, Fatigue hidden)', () => {
  const s: any = {};
  normalizeState(s);
  const nav = s.global.nav;
  assert.deepEqual([...nav.order].sort(), [...NAV_KEYS].sort());
  assert.equal(nav.revealControl, 'settings');
  assert.equal(nav.showHidden, false);
  assert.equal(nav.fabs.today, true);
  const expect: Record<string, string> = {
    today: 'top', pobox: 'top', schedule: 'bottom', rpe: 'bottom',
    planner: 'bottom', settings: 'bottom', fatigue: 'hidden',
  };
  for (const k of NAV_KEYS) {
    assert.equal(nav.layout[k], expect[k], `${k} placement`);
  }
});

test('normalizeState: nav config is idempotent', () => {
  const s: any = {};
  normalizeState(s);
  assert.equal(normalizeState(s), false);
});

test('normalizeState: migrates a legacy bottom navPosition into per-button bottom', () => {
  const s: any = { global: { navPosition: 'bottom' } };
  normalizeState(s);
  const L = s.global.nav.layout;
  for (const k of ['fatigue', 'schedule', 'planner', 'settings']) {
    assert.equal(L[k], 'bottom', k);
  }
  assert.equal(L.today, 'top');
  assert.equal(L.pobox, 'top');
  assert.equal(L.rpe, 'hidden');
});

test('normalizeState: never lets the Settings button be hidden', () => {
  const s: any = {
    global: {
      nav: { order: [...NAV_KEYS], layout: { settings: 'hidden' }, revealControl: 'settings', showHidden: false },
    },
  };
  normalizeState(s);
  assert.equal(s.global.nav.layout.settings, 'top');
});

test('normalizeState: repairs invalid placements and reveal control', () => {
  const s: any = {
    global: {
      nav: {
        order: [...NAV_KEYS],
        layout: { today: 'sideways', fatigue: 'bottom' },
        revealControl: 'whatever',
        showHidden: 'yes',
      },
    },
  };
  normalizeState(s);
  const nav = s.global.nav;
  assert.equal(nav.layout.today, 'top');
  assert.equal(nav.layout.fatigue, 'bottom');
  assert.equal(nav.layout.rpe, 'hidden');
  assert.equal(nav.revealControl, 'settings');
  assert.equal(nav.showHidden, false);
});

test('normalizeState: seeds default FAB options (all on, incl. Today)', () => {
  const s: any = {};
  normalizeState(s);
  assert.deepEqual(plain(s.global.nav.fabs), { today: true, scrollTop: true, goToTraining: true });
});

test('normalizeState: repairs invalid FAB options to their defaults', () => {
  const s: any = {
    global: {
      nav: {
        order: [...NAV_KEYS], layout: {}, revealControl: 'settings', showHidden: false,
        fabs: { today: 'yes', scrollTop: 0 },
      },
    },
  };
  normalizeState(s);
  assert.equal(s.global.nav.fabs.today, false);
  assert.equal(s.global.nav.fabs.scrollTop, true);
  assert.equal(s.global.nav.fabs.goToTraining, true);
});

test('normalizeState: preserves explicit FAB choices', () => {
  const s: any = {
    global: {
      nav: {
        order: [...NAV_KEYS], layout: {}, revealControl: 'settings', showHidden: false,
        fabs: { today: true, scrollTop: false, goToTraining: true },
      },
    },
  };
  normalizeState(s);
  assert.deepEqual(plain(s.global.nav.fabs), { today: true, scrollTop: false, goToTraining: true });
});

test('normalizeState: seeds the default control layout (Adjustments + Loads hidden)', () => {
  const s: any = {};
  normalizeState(s);
  const c = s.global.controls;
  const HIDDEN = ['adjust', 'loads'];
  assert.deepEqual(plain(c.order), plain(CONTROL_KEYS));
  for (const k of CONTROL_KEYS) {
    assert.equal(c.layout[k], HIDDEN.includes(k) ? 'hidden' : 'show', k);
  }
});

test('normalizeState: migrates legacy showLoadsToggle into the Loads control', () => {
  const on: any = { global: { showLoadsToggle: true } };
  normalizeState(on);
  assert.equal(on.global.controls.layout.loads, 'show');

  const off: any = { global: { showLoadsToggle: false } };
  normalizeState(off);
  assert.equal(off.global.controls.layout.loads, 'hidden');
});

test('normalizeState: repairs invalid control placements and prunes the order', () => {
  const s: any = { global: { controls: { order: ['warmup', 'warmup', 'bogus', 'max'], layout: { max: 'sideways' } } } };
  normalizeState(s);
  const c = s.global.controls;
  assert.equal(c.order.length, CONTROL_KEYS.length);
  assert.deepEqual([...c.order].sort(), [...CONTROL_KEYS].sort());
  assert.equal(c.order.indexOf('warmup'), 0);
  assert.ok(!c.order.includes('bogus'));
  assert.equal(c.layout.max, 'show');
  assert.equal(c.layout.loads, 'hidden');
});

test('normalizeState: dedups, completes, and prunes the nav order', () => {
  const s: any = {
    global: {
      nav: {
        order: ['settings', 'settings', 'bogus', 'today'],
        layout: {},
        revealControl: 'menu',
        showHidden: true,
      },
    },
  };
  normalizeState(s);
  const order = s.global.nav.order;
  assert.equal(order.length, NAV_KEYS.length);
  assert.deepEqual([...order].sort(), [...NAV_KEYS].sort());
  assert.equal(order.indexOf('settings'), 0);
  assert.ok(!order.includes('bogus'));
  assert.equal(s.global.nav.revealControl, 'menu');
  assert.equal(s.global.nav.showHidden, true);
});


test('load: host-defaults migration applies the curated coach defaults once', () => {
  const seed: any = plain(defaultState);
  seed.lifts.bench.program = 'building';
  seed.lifts.ohp.variation = 0;
  seed.global.nav.fabs.today = false;
  seed.global.controls.layout.adjust = 'show';
  const st = loadWith({ pl_state: JSON.stringify(seed), pullup_migrated: 'true', rpe_v2_migrated: 'true' });
  assert.equal(st.lifts.bench.program, 'peaking');
  assert.ok(st.variationsDict.ohp.includes('Close Grip OHP'));
  assert.equal(st.variationsDict.ohp[st.lifts.ohp.variation], 'Close Grip OHP');
  assert.equal(st.global.nav.fabs.today, true);
  assert.equal(st.global.nav.layout.today, 'top');
  assert.equal(st.global.nav.layout.fatigue, 'hidden');
  assert.equal(st.global.controls.layout.adjust, 'hidden');
  assert.equal(localStorage.getItem('host_defaults_v3_migrated'), 'true');
});

test('load: host-defaults migration is skipped once its flag is set', () => {
  const seed: any = plain(defaultState);
  seed.lifts.bench.program = 'building';
  const st = loadWith({
    pl_state: JSON.stringify(seed),
    pullup_migrated: 'true', rpe_v2_migrated: 'true', host_defaults_v3_migrated: 'true',
  });
  assert.equal(st.lifts.bench.program, 'building');
});
