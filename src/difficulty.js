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

// Base tick: 180ms (level 1) down to 80ms (level 10).
export function baseTickMs(level) { return lerp(level, 180, 80); }

// Ms removed from the tick per food eaten: 1 (level 1) up to 5 (level 10).
export function speedStepMs(level) { return lerp(level, 1, 5); }

// Absolute floor for the tick interval.
export const MIN_TICK_MS = 50;
