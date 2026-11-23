import test from 'node:test';
import assert from 'node:assert/strict';
import { interpolateSnake, snapshotSnake } from '../src/interp.js';
import { createGame, step } from '../src/game.js';

const P = [{ x: 3, y: 2 }, { x: 2, y: 2 }];
const C = [{ x: 4, y: 2 }, { x: 3, y: 2 }];

test('straight movement', () => {
  assert.deepEqual(interpolateSnake(P, C, 0, 10, 10), P);
  assert.deepEqual(interpolateSnake(P, C, 0.5, 10, 10), [{ x: 3.5, y: 2 }, { x: 2.5, y: 2 }]);
  assert.deepEqual(interpolateSnake(P, C, 1, 10, 10), C);
});
test('turn', () => {
  const r = interpolateSnake([{ x: 3, y: 2 }], [{ x: 3, y: 3 }], 0.5, 10, 10);
  assert.deepEqual(r, [{ x: 3, y: 2.5 }]);
});
test('wrap right/left/vertical', () => {
  assert.equal(interpolateSnake([{ x: 9, y: 0 }], [{ x: 0, y: 0 }], 0.5, 10, 10)[0].x, 9.5);
  assert.equal(interpolateSnake([{ x: 0, y: 0 }], [{ x: 9, y: 0 }], 0.5, 10, 10)[0].x, -0.5);
  assert.equal(interpolateSnake([{ x: 0, y: 9 }], [{ x: 0, y: 0 }], 0.5, 10, 10)[0].y, 9.5);
  assert.equal(interpolateSnake([{ x: 0, y: 0 }], [{ x: 0, y: 9 }], 0.5, 10, 10)[0].y, -0.5);
  assert.deepEqual(interpolateSnake([{ x: 9, y: 0 }], [{ x: 0, y: 0 }], 1, 10, 10), [{ x: 0, y: 0 }]);
});
test('growth uses curr for new tail', () => {
  const curr = [...C, { x: 2, y: 2 }];
  const r = interpolateSnake(P, curr, 0.5, 10, 10);
  assert.equal(r.length, 3);
  assert.deepEqual(r[2], curr[2]);
});
test('null prev copies curr', () => {
  const r = interpolateSnake(null, C, 0.5, 10, 10);
  assert.deepEqual(r, C);
  assert.notEqual(r[0], C[0]);
  assert.deepEqual(interpolateSnake(undefined, C, 0.5, 10, 10), C);
});
test('alpha clamping', () => {
  assert.deepEqual(interpolateSnake(P, C, -1, 10, 10), P);
  assert.deepEqual(interpolateSnake(P, C, 2, 10, 10), C);
});
test('snapshot independent after step', () => {
  const g = createGame({ rng: () => 0.5 });
  const snap = snapshotSnake(g.snake);
  const copy = JSON.parse(JSON.stringify(snap));
  step(g);
  assert.deepEqual(snap, copy);
  assert.notEqual(snap[0], g.snake[0]);
});
