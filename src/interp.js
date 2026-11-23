// Pure snake interpolation (no DOM).
function lerpAxis(p, c, alpha) {
  let d = c - p;
  if (Math.abs(d) > 1) d = -Math.sign(d);
  return p + d * alpha;
}

export function interpolateSnake(prev, curr, alpha, cols, rows) {
  if (!prev) return curr.map((s) => ({ x: s.x, y: s.y }));
  const a = Math.min(1, Math.max(0, Number.isFinite(alpha) ? alpha : 0));
  return curr.map((c, i) => {
    const p = prev[i];
    if (!p || a >= 1) return { x: c.x, y: c.y };
    return { x: lerpAxis(p.x, c.x, a), y: lerpAxis(p.y, c.y, a) };
  });
}

export function snapshotSnake(snake) {
  return snake.map((s) => ({ x: s.x, y: s.y }));
}

// Fraction of the current tick elapsed, clamped to [0,1]; 1 means "settled".
export function frameAlpha({ mode, gameOver, acc, tick, reducedMotion }) {
  if (reducedMotion || gameOver || mode !== 'running') return 1;
  if (!(tick > 0) || !Number.isFinite(acc)) return 1;
  return Math.min(1, Math.max(0, acc / tick));
}
