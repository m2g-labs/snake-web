import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCellSize, resizeCanvas, draw } from '../src/render.js';
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
  assert.equal(calls.length, 1 + 1 + s.snake.length);
});
