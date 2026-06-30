import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initState } from './lib/state';
import App from './App';

import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/program.css';
import './styles/calendar.css';
import './styles/settings.css';
import './styles/fatigue.css';
import './styles/plates.css';
import './styles/warmup.css';

initState();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
