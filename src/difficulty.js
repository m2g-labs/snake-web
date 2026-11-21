// Pure difficulty mapping (no DOM).
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 10;
export const DIFFICULTY_DEFAULT = 5;

export function clampDifficulty(v) {
  const n = Math.round(Number(v));
  if (v === null || v === '' || !Number.isFinite(n)) return DIFFICULTY_DEFAULT;
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, n));
}

function lerp(level, a, b) {
  const t = (clampDifficulty(level) - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN);
  return Math.round(a + (b - a) * t);
}

// Square board size: 30 (level 1) down to 12 (level 10).
export function boardSize(level) { return lerp(level, 30, 12); }

// Base tick: 180ms (level 1) down to 70ms (level 10).
export function baseTickMs(level) { return lerp(level, 180, 70); }
