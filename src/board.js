// Board size options (pure; no DOM).
export const BOARD_SIZES = [10, 15, 20, 25, 30];
export const BOARD_SIZE_DEFAULT = 20;

export function clampBoardSize(v) {
  if (typeof v === 'string') {
    if (!/^\d+$/.test(v.trim())) return BOARD_SIZE_DEFAULT;
    v = Number.parseInt(v, 10);
  }
  return typeof v === 'number' && BOARD_SIZES.includes(v) ? v : BOARD_SIZE_DEFAULT;
}
