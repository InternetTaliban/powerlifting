const SCROLL_DURATION_MS = 450;
const ACTIVE_WEEK_TOP_OFFSET_PX = 80;

export function snappyScrollTo(targetY: number, duration = 400): void {
  const startY = window.scrollY;
  const distance = targetY - startY;
  let startTime: number | null = null;

  function animation(currentTime: number) {
    if (startTime === null) {
      startTime = currentTime;
    }

    const progress = Math.min((currentTime - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * (1 - Math.pow(1 - progress, 4)));

    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

export function scrollToTop(): void {
  snappyScrollTo(0, SCROLL_DURATION_MS);
}

export function scrollToActiveWeek(): void {
  const container = document.getElementById('programContainer');
  if (!container) {
    return;
  }

  const uncompleted = container.querySelector('.week-card tbody tr:not(.completed)');
  const card = uncompleted && uncompleted.closest('.week-card');
  if (!card) {
    return;
  }

  const targetY = card.getBoundingClientRect().top + window.scrollY - ACTIVE_WEEK_TOP_OFFSET_PX;
  snappyScrollTo(targetY, SCROLL_DURATION_MS);
}
