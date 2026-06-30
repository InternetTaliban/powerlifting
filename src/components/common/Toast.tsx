import { useEffect, useState } from 'react';
import { useUI } from '../../store/store';
import { clearToast } from '../../store/actions';

const TOAST_HIDE_MS = 3000;
const TOAST_CLEAR_MS = 3300;

export function Toast() {
  const ui = useUI();
  const [show, setShow] = useState(false);
  const toast = ui.toast;

  useEffect(() => {
    if (!toast) {
      return;
    }
    setShow(true);
    const hide = setTimeout(() => setShow(false), TOAST_HIDE_MS);
    const drop = setTimeout(() => clearToast(), TOAST_CLEAR_MS);
    return () => {
      clearTimeout(hide);
      clearTimeout(drop);
    };
  }, [toast?.key]);

  if (!toast) {
    return null;
  }
  return (
    <div id="toast" role="status" aria-live="polite" className={show ? 'show' : ''}>
      {toast.message}
    </div>
  );
}
