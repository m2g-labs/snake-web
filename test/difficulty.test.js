import test from 'node:test';
import assert from 'node:assert/strict';
import { clampDifficulty, baseTickMs, speedStepMs, MIN_TICK_MS as DIFF_MIN_TICK, DIFFICULTY_DEFAULT } from '../src/difficulty.js';
import { loadDifficulty, saveDifficulty, DIFFICULTY_KEY } from '../src/storage.js';
import { tickMs, BASE_TICK_MS, MIN_TICK_MS } from '../src/game.js';

const mem = (init = {}) => ({ d: { ...init }, getItem(k) { return k in this.d ? this.d[k] : null; }, setItem(k, v) { this.d[k] = v; } });

test('clamp', () => {
  assert.equal(clampDifficulty(0), 1);
  assert.equal(clampDifficulty(99), 10);
  assert.equal(clampDifficulty('abc'), DIFFICULTY_DEFAULT);
  assert.equal(clampDifficulty(null), DIFFICULTY_DEFAULT);
  assert.equal(clampDifficulty(3), 3);
});
test('mappings monotonic with endpoints', () => {
  assert.equal(baseTickMs(1), 180); assert.equal(baseTickMs(10), 80);
  assert.equal(speedStepMs(1), 1); assert.equal(speedStepMs(10), 5);
  for (let l = 2; l <= 10; l++) {
    assert.ok(baseTickMs(l) < baseTickMs(l - 1));
    assert.ok(speedStepMs(l) >= speedStepMs(l - 1));
  }
});
test('storage', () => {
  assert.equal(loadDifficulty(mem()), 5);
  for (const bad of ['x', '0', '11', '-2', '3.5', '']) assert.equal(loadDifficulty(mem({ [DIFFICULTY_KEY]: bad })), 5);
  const s = mem(); saveDifficulty(7, s); assert.equal(loadDifficulty(s), 7);
  assert.equal(loadDifficulty({ getItem() { throw new Error('x'); } }), 5);
  assert.equal(saveDifficulty(3, { setItem() { throw new Error('x'); } }), false);
});
test('tickMs base', () => {
  assert.equal(tickMs(0), BASE_TICK_MS);
  assert.equal(tickMs(1e6), MIN_TICK_MS);
  assert.equal(tickMs(1e6, 160), 104);
  assert.equal(tickMs(10, 160), 150);
  assert.equal(tickMs(0, 90), 90);
});
test('tickMs with step and floor', () => {
  assert.equal(DIFF_MIN_TICK, 50);
  assert.equal(tickMs(0, 180, 3, DIFF_MIN_TICK), 180);
  assert.equal(tickMs(10, 180, 3, DIFF_MIN_TICK), 150);
  assert.equal(tickMs(1e6, 180, 3, DIFF_MIN_TICK), 50);
  assert.equal(tickMs(-5, 100, 2, 50), 100);
  assert.equal(tickMs(NaN, 100, 2, 50), 100);
});
