import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCellSize, resizeCanvas, draw, FOOD_ICONS } from '../src/render.js';
import { createGame } from '../src/game.js';

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

test('draw paints food and every snake segment', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, k) => (...a) => { if (k === 'fillRect') calls.push(a); }, set: () => true });
  const s = createGame({ cols: 10, rows: 10 });
  draw(ctx, s, 10, 1);
  // background + snake segments; food is drawn as emoji text at cell >= 10
  assert.equal(calls.length, 1 + s.snake.length);
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
  assert.equal(b.rects.length, 2 + b.s.snake.length);
});
