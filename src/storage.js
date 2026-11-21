// High score persistence; safe when localStorage is unavailable or throws.
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
