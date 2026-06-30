import type { ReactNode } from 'react';
import { setActiveView } from '../../store/actions';

interface Props {
  title: string;
  action?: ReactNode;
}

export function SubViewHeader({ title, action }: Props) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="nav-btn back-btn" type="button" onClick={() => setActiveView('mainView')}>&lt; Back</button>
        <h2>{title}</h2>
      </div>
      {action && <div className="header-right">{action}</div>}
    </header>
  );
}
