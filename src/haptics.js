export const HAPTIC_EAT = 30;
export const HAPTIC_OVER = [80, 40, 120];

export function vibrate(pattern, nav = globalThis.navigator) {
  try {
    if (nav && typeof nav.vibrate === 'function') return !!nav.vibrate(pattern);
  } catch {
    // ignore
  }
  return false;
}
