import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCellSize, resizeCanvas, headDirection, segmentRadius, draw, FOOD_ICONS } from '../src/render.js';
import { createGame } from '../src/game.js';

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

test('fitCellSize fits the smaller dimension', () => {
  assert.equal(fitCellSize(400, 200, 20, 20), 10);
  assert.equal(fitCellSize(5, 5, 20, 20), 1);
});

test('resizeCanvas scales backing store by dpr', () => {
  const c = { style: {} };
  const cell = resizeCanvas(c, 400, 400, 20, 20, 2);
  assert.equal(cell, 20);
  assert.equal(c.style.width, '400px');
  assert.equal(c.width, 800);
});

test('draw paints squares below 6px and arcs for the body at larger cells', () => {
  const run = (cell) => {
    const rects = [], arcs = [];
    const ctx = new Proxy({}, { get: (_, k) => (...a) => { if (k === 'fillRect') rects.push(a); if (k === 'arc') arcs.push(a); }, set: () => true });
    const s = createGame({ cols: 10, rows: 10 });
    draw(ctx, s, cell, 1);
    return { rects, arcs, s };
  };
  const a = run(4);
  assert.equal(a.rects.length, 1 + 1 + a.s.snake.length);
  const b = run(20);
  assert.ok(b.arcs.length > 0);
});

test('draw renders food emoji centered via fillText, red square below 10px', () => {
  const run = (cell) => {
    const texts = [], rects = [];
    const ctx = new Proxy({}, { get: (_, k) => (...a) => { if (k === 'fillText') texts.push(a); if (k === 'fillRect') rects.push(a); }, set: () => true });
    const s = createGame({ cols: 10, rows: 10 });
    s.food = { x: 1, y: 2, kind: 3 };
    draw(ctx, s, cell, 1);
    return { texts, rects, s };
  };
  const a = run(20);
  assert.equal(a.texts.length, 1);
  assert.deepEqual(a.texts[0], [FOOD_ICONS[3], 30, 50]);
  const b = run(8);
  assert.equal(b.texts.length, 0);
  // background + food square
  assert.equal(b.rects.length, 2);
  assert.deepEqual(b.rects[1].slice(0, 2), [9, 17]);
});
