// Pure key -> action mapping (no DOM).
const DIR_KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};

// Returns { type: 'dir', dir } | { type: 'pause' } | { type: 'start' } | null.
// mode: 'start' | 'running' | 'paused' | 'over'
export function keyToAction(key, mode) {
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (DIR_KEYS[k]) return { type: 'dir', dir: DIR_KEYS[k] };
  if (k === 'p') return mode === 'running' || mode === 'paused' ? { type: 'pause' } : null;
  if (k === ' ') {
    return mode === 'running' || mode === 'paused' ? { type: 'pause' } : { type: 'start' };
  }
  if (k === 'Enter') return mode === 'running' ? null : { type: 'start' };
  return null;
}

// Keys whose default browser behavior (scrolling) must be suppressed.
export function shouldPreventDefault(key) {
  return key.startsWith('Arrow') || key === ' ';
}

// Mode to switch to when the tab/window loses focus (null = no change).
export function modeOnFocusLoss(mode) {
  return mode === 'running' ? 'paused' : null;
}
