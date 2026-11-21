import test from 'node:test';
import assert from 'node:assert/strict';
import { headDirection, segmentRadius, draw } from '../src/render.js';

test('headDirection', () => {
  assert.equal(headDirection([{ x: 1, y: 1 }]), 'right');
  assert.equal(headDirection([{ x: 2, y: 1 }, { x: 1, y: 1 }]), 'right');
  assert.equal(headDirection([{ x: 0, y: 1 }, { x: 1, y: 1 }]), 'left');
  assert.equal(headDirection([{ x: 1, y: 0 }, { x: 1, y: 1 }]), 'up');
  assert.equal(headDirection([{ x: 1, y: 2 }, { x: 1, y: 1 }]), 'down');
  // wrap-around
  assert.equal(headDirection([{ x: 0, y: 1 }, { x: 9, y: 1 }]), 'right');
  assert.equal(headDirection([{ x: 1, y: 9 }, { x: 1, y: 0 }]), 'up');
});

test('segmentRadius', () => {
  const n = 8;
  assert.ok(segmentRadius(0, n, 20) > segmentRadius(n - 1, n, 20));
  for (let i = 1; i < n; i++) assert.ok(segmentRadius(i, n, 20) <= segmentRadius(i - 1, n, 20));
  assert.ok(segmentRadius(n - 1, n, 1) >= 1);
  assert.ok(segmentRadius(0, 1, 20) >= 1);
});

test('draw does not throw', () => {
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) });
  for (const len of [1, 5]) {
    for (const cell of [4, 20]) {
      const snake = Array.from({ length: len }, (_, i) => ({ x: 5 - i, y: 3 }));
      draw(ctx, { cols: 10, rows: 10, snake, food: { x: 1, y: 1, kind: 0 } }, cell);
    }
  }
});
