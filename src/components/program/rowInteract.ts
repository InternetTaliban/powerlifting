// Shared latch so a long-press that opens the Log Weight modal suppresses the
// click the browser then fires on release.
export const rowClickSuppress = { current: false };
