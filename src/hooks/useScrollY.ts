import { useEffect, useState } from 'react';

export function useScrollY(): number {
  const [y, setY] = useState(typeof window === 'undefined' ? 0 : window.scrollY);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return y;
}
