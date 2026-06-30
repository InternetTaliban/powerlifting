import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const updateRef = useRef<(reload?: boolean) => Promise<void>>();

  useEffect(() => {
    updateRef.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
    });
  }, []);

  if (!needRefresh) {
    return null;
  }

  const onRefresh = () => {
    setBusy(true);
    updateRef.current?.(true);
  };

  return (
    <div id="updateBanner" className="update-banner" role="status" aria-live="polite" style={{ display: 'flex' }}>
      <span>A new version is available.</span>
      <button className="update-banner-refresh" type="button" disabled={busy} onClick={onRefresh}>
        Refresh
      </button>
    </div>
  );
}
