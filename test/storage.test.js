import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHighScore, saveHighScore } from '../src/storage.js';
import { tickMs, BASE_TICK_MS, MIN_TICK_MS } from '../src/game.js';

const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; } }; };
const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };

test('high score round trips', () => {
  const s = mem();
  assert.equal(loadHighScore(s), 0);
  assert.equal(saveHighScore(7, s), true);
  assert.equal(loadHighScore(s), 7);
});
test('garbage value gives 0', () => {
  const s = mem(); s.setItem('snake-high-score', 'abc');
  assert.equal(loadHighScore(s), 0);
});
test('throwing/missing storage is safe', () => {
  assert.equal(loadHighScore(bad), 0);
  assert.equal(saveHighScore(3, bad), false);
  assert.equal(loadHighScore(undefined), 0);
  assert.equal(saveHighScore(3, null), false);
});
test('tickMs decreases and is capped', () => {
  assert.equal(tickMs(0), BASE_TICK_MS);
  assert.ok(tickMs(5) < tickMs(1));
  assert.equal(tickMs(1000), MIN_TICK_MS);
  assert.equal(tickMs(-3), BASE_TICK_MS);
  assert.equal(tickMs(NaN), BASE_TICK_MS);
});

test('throwing localStorage getter is safe with default store', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('SecurityError'); },
  });
  try {
    assert.equal(loadHighScore(), 0);
    assert.equal(saveHighScore(5), false);
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete globalThis.localStorage;
  }
});

import { loadBoardSize, saveBoardSize, BOARD_SIZE_KEY } from '../src/storage.js';
import { BOARD_SIZES } from '../src/board.js';
test('board size round trips and defaults', () => {
  const s = mem();
  assert.equal(loadBoardSize(s), 20);
  for (const n of BOARD_SIZES) { assert.equal(saveBoardSize(n, s), true); assert.equal(loadBoardSize(s), n); }
  s.setItem(BOARD_SIZE_KEY, 'zzz');
  assert.equal(loadBoardSize(s), 20);
  assert.equal(loadBoardSize(bad), 20);
  assert.equal(saveBoardSize(15, bad), false);
  assert.equal(loadBoardSize(null), 20);
});
