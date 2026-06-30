import { useEffect } from 'react';
import { useUI } from '../../store/store';
import { clearAlert, clearConfirm } from '../../store/actions';

export function ConfirmDialog() {
  const ui = useUI();
  const confirm = ui.confirm;
  const alert = ui.alert;
  const open = !!(confirm || alert);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }
      if (confirm) {
        clearConfirm();
      } else {
        clearAlert();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, confirm]);

  if (!open) {
    return null;
  }

  const onConfirmClick = () => {
    if (!confirm) {
      return;
    }
    const fn = confirm.onConfirm;
    clearConfirm();
    fn();
  };

  const onOkClick = () => {
    const fn = alert?.onOk;
    clearAlert();
    fn?.();
  };

  return (
    <div
      id="customDialog"
      className="custom-dialog-overlay"
      style={{ display: 'flex' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dialogMessage"
    >
      <div className="custom-dialog-box">
        <p id="dialogMessage">{confirm ? confirm.message : alert?.message}</p>
        {confirm?.details && confirm.details.length > 0 && (
          <ul className="dialog-issue-list">
            {confirm.details.map((issue, i) => (
              <li key={i}>
                <span className="dialog-issue-name">{issue.setting}</span>
                <span className={issue.resolution === 'recovered' ? 'dialog-issue-recovered' : 'dialog-issue-default'}>
                  {issue.resolution === 'recovered' ? 'recovered' : 'reset to default'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="dialog-buttons" id="dialogButtons">
          {confirm ? (
            <>
              <button type="button" className="btn-dialog-cancel" onClick={() => clearConfirm()}>Cancel</button>
              <button
                type="button"
                className={confirm.danger ? 'btn-dialog-danger' : 'btn-dialog-confirm'}
                onClick={onConfirmClick}
              >
                {confirm.confirmLabel ?? 'Confirm'}
              </button>
            </>
          ) : (
            <button type="button" className="btn-dialog-ok" onClick={onOkClick}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
