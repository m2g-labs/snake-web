// Pure swipe detection: returns 'up'|'down'|'left'|'right' or null if below threshold.
export function detectSwipe(dx, dy, threshold = 30) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold) return null;
  if (ax > ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
