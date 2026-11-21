// High score persistence; safe when localStorage is unavailable or throws.
import { DIFFICULTY_MIN, DIFFICULTY_MAX, DIFFICULTY_DEFAULT, clampDifficulty } from './difficulty.js';
export const KEY = 'snake-high-score';

export function loadHighScore(store) {
  try {
    store = store ?? globalThis.localStorage;
    const n = Number.parseInt(store.getItem(KEY), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score, store) {
  try {
    store = store ?? globalThis.localStorage;
    store.setItem(KEY, String(score));
    return true;
  } catch {
    return false;
  }
}

export const DIFFICULTY_KEY = 'snake-difficulty';

export function loadDifficulty(store) {
  try {
    store = store ?? globalThis.localStorage;
    const raw = store.getItem(DIFFICULTY_KEY);
    if (raw === null || raw === undefined || !/^\d+$/.test(String(raw).trim())) return DIFFICULTY_DEFAULT;
    const n = Number.parseInt(raw, 10);
    return n >= DIFFICULTY_MIN && n <= DIFFICULTY_MAX ? n : DIFFICULTY_DEFAULT;
  } catch {
    return DIFFICULTY_DEFAULT;
  }
}

export function saveDifficulty(level, store) {
  try {
    store = store ?? globalThis.localStorage;
    store.setItem(DIFFICULTY_KEY, String(clampDifficulty(level)));
    return true;
  } catch {
    return false;
  }
}
