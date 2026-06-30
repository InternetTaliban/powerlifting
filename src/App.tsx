import { useEffect } from 'react';
import { useStore, useUI } from './store/store';
import { TopNav } from './components/nav/TopNav';
import { BottomNav } from './components/nav/BottomNav';
import { Fabs } from './components/nav/Fabs';
import { Toast } from './components/common/Toast';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { ModalHost } from './components/modals/ModalHost';
import { UpdateBanner } from './components/UpdateBanner';
import { TrainingView } from './components/views/TrainingView';
import { PlannerView } from './components/views/PlannerView';
import { ScheduleView } from './components/views/ScheduleView';
import { FatigueView } from './components/views/FatigueView';
import { PlatesView } from './components/views/PlatesView';
import { SettingsView } from './components/views/SettingsView';
import { RpeGuideView } from './components/views/RpeGuideView';
import { PoBoxView } from './components/views/PoBoxView';
import { cycleUnit, cycleRounding, setActiveView } from './store/actions';
import { roundingDict } from './lib/data';
import type { ViewId } from './lib/types';

const SUBVIEWS: { id: ViewId; title: string; component: () => JSX.Element }[] = [
  { id: 'calendarView', title: 'Weekly Planner', component: PlannerView },
  { id: 'scheduleView', title: 'Master Split', component: ScheduleView },
  { id: 'fatigueView', title: 'Fatigue Manager', component: FatigueView },
  { id: 'platesView', title: 'Plate Loading', component: PlatesView },
  { id: 'settingsView', title: 'Settings', component: SettingsView },
  { id: 'rpeView', title: 'RPE & RIR Guide', component: RpeGuideView },
  { id: 'poboxView', title: 'PO Box', component: PoBoxView },
];

export default function App() {
  const state = useStore();
  const ui = useUI();
  const activeView = ui.activeView;

  useEffect(() => {
    document.body.classList.toggle('subview', activeView !== 'mainView');
  }, [activeView]);

  useEffect(() => {
    document.body.classList.toggle('back-bottom', state.global.backPosition === 'bottom');
    const anyBottom = state.global.nav.order.some((k) => state.global.nav.layout[k] === 'bottom');
    document.body.classList.toggle('nav-bottom', anyBottom);
    document.body.classList.toggle('back-always', state.global.alwaysShowBack);
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--dialog-bias', state.global.dialogOffset + '%');
  }, [state.global.dialogOffset]);

  return (
    <>
      <main id="mainView" className={'view' + (activeView === 'mainView' ? ' active' : '')}>
        <header className="header">
          <div className="header-left">
            {state.global.alwaysShowBack && (
              <button className="nav-btn back-btn" type="button" onClick={() => setActiveView('mainView')}>
                &lt; Back
              </button>
            )}
            <h2>Powerlifting Hub</h2>
          </div>
          <div className="header-right">
            <div className="global-settings">
              <div className="input-group">
                <label htmlFor="btnUnit">Unit</label>
                <button id="btnUnit" className="cycle-btn" type="button" onClick={() => cycleUnit()}>
                  {state.global.unit}
                </button>
              </div>
              <div className="input-group">
                <label htmlFor="btnRounding">Weight Calc</label>
                <button id="btnRounding" className="cycle-btn" type="button" onClick={() => cycleRounding()}>
                  {roundingDict[state.global.rounding]}
                </button>
              </div>
            </div>
            <TopNav />
          </div>
        </header>
        <TrainingView />
      </main>

      {SUBVIEWS.map(({ id, title, component: View }) => (
        <section key={id} id={id} className={'view' + (activeView === id ? ' active' : '')} aria-label={title}>
          {activeView === id && <View />}
        </section>
      ))}

      <Fabs />
      <BottomNav />

      <ModalHost />
      <Toast />
      <ConfirmDialog />
      <UpdateBanner />
    </>
  );
}
