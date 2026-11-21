import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, setDirection } from '../src/game.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const mk = (o = {}) => createGame({ cols: 6, rows: 6, rng: seq(0), ...o });

test('moves one cell per step', () => {
  const g = mk();
  const h = g.snake[0];
  step(g);
  assert.deepEqual(g.snake[0], { x: h.x + 1, y: h.y });
  assert.equal(g.snake.length, 2);
});

test('eating grows and scores, food moves off snake', () => {
  const g = mk();
  const h = g.snake[0];
  g.food = { x: h.x + 1, y: h.y };
  step(g);
  assert.equal(g.score, 1);
  assert.equal(g.snake.length, 3);
  assert.ok(!g.snake.some((s) => s.x === g.food.x && s.y === g.food.y));
});

test('food never spawns on snake', () => {
  for (let k = 0; k < 20; k++) {
    let n = 0;
    const g = createGame({ cols: 4, rows: 4, rng: () => ((n = (n * 7 + 3) % 11) / 11) });
    assert.ok(!g.snake.some((s) => s.x === g.food.x && s.y === g.food.y));
  }
});

const wrapCase = (dir, snake, expected) => {
  const g = mk();
  g.snake = snake;
  g.dir = dir;
  g.food = { x: 3, y: 3 };
  step(g);
  assert.equal(g.gameOver, false);
  assert.deepEqual(g.snake[0], expected);
};

test('wraps right edge to left', () => wrapCase('right', [{x:5,y:2},{x:4,y:2}], {x:0,y:2}));
test('wraps left edge to right', () => wrapCase('left', [{x:0,y:2},{x:1,y:2}], {x:5,y:2}));
test('wraps top edge to bottom', () => wrapCase('up', [{x:2,y:0},{x:2,y:1}], {x:2,y:5}));
test('wraps bottom edge to top', () => wrapCase('down', [{x:2,y:5},{x:2,y:4}], {x:2,y:0}));

test('free-running snake keeps going across walls', () => {
  const g = mk();
  g.food = { x: 0, y: 0 };
  for (let i = 0; i < 20; i++) step(g);
  assert.equal(g.gameOver, false);
});

test('eating across a wrap grows snake', () => {
  const g = mk();
  g.snake = [{x:5,y:2},{x:4,y:2}];
  g.dir = 'right';
  g.food = { x: 0, y: 2 };
  step(g);
  assert.equal(g.score, 1);
  assert.equal(g.snake.length, 3);
  assert.deepEqual(g.snake[0], { x: 0, y: 2 });
});

test('self collision after wrap ends game', () => {
  const g = mk();
  g.snake = [{x:5,y:2},{x:5,y:3},{x:0,y:3},{x:0,y:2},{x:0,y:1}];
  g.dir = 'right';
  g.food = { x: 3, y: 3 };
  step(g); // wraps to (0,2), occupied by body
  assert.equal(g.gameOver, true);
});

test('self collision ends game', () => {
  const g = mk();
  g.snake = [{x:2,y:2},{x:2,y:3},{x:3,y:3},{x:3,y:2},{x:3,y:1}];
  g.dir = 'up';
  setDirection(g, 'left'); // head (2,2) -> (1,2): fine
  g.snake = [{x:2,y:2},{x:3,y:2},{x:3,y:3},{x:2,y:3},{x:1,y:3}];
  g.queue = []; g.dir = 'right';
  setDirection(g, 'down');
  step(g); // moves into (2,3) body
  assert.equal(g.gameOver, true);
});

test('reverse direction ignored', () => {
  const g = mk();
  setDirection(g, 'left');
  step(g);
  assert.equal(g.gameOver, false);
  assert.equal(g.dir, 'right');
});

test('two quick inputs in one tick cannot reverse', () => {
  const g = mk();
  setDirection(g, 'up');
  setDirection(g, 'left'); // legal after up, applied next tick
  step(g);
  assert.equal(g.dir, 'up');
  step(g);
  assert.equal(g.dir, 'left');
  assert.equal(g.gameOver, false);
});

test('win when board full', () => {
  const g = createGame({ cols: 3, rows: 1, rng: seq(0) });
  assert.equal(g.snake.length, 2);
  g.dir = 'left';
  g.snake = [{x:1,y:0},{x:2,y:0}];
  g.food = { x: 0, y: 0 };
  step(g);
  assert.equal(g.won, true);
  assert.equal(g.gameOver, true);
});

test('deterministic with same rng', () => {
  const a = createGame({ cols: 8, rows: 8, rng: seq(0.3, 0.6) });
  const b = createGame({ cols: 8, rows: 8, rng: seq(0.3, 0.6) });
  assert.deepEqual(a.food, b.food);
});
