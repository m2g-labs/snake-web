import test from 'node:test';
import assert from 'node:assert/strict';
import { seededRng, randomSeed } from '../src/rng.js';
import { createGame, step, setDirection } from '../src/game.js';

const take = (r, n) => Array.from({ length: n }, () => r());

test('same seed same sequence, different seeds differ', () => {
  assert.deepEqual(take(seededRng(42), 20), take(seededRng(42), 20));
  assert.notDeepEqual(take(seededRng(42), 20), take(seededRng(43), 20));
});

test('values in [0,1)', () => {
  for (const v of take(seededRng(1), 5000)) assert.ok(v >= 0 && v < 1);
});

test('randomSeed returns uint32', () => {
  const s = randomSeed();
  assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff);
});

test('two seeded games produce identical food sequences', () => {
  const a = createGame({ rng: seededRng(7) });
  const b = createGame({ rng: seededRng(7) });
  const seqA = [{ ...a.food }];
  const seqB = [{ ...b.food }];
  for (let i = 0; i < 500 && !a.gameOver && !b.gameOver && a.score < 5; i++) {
    // same input to both games: steer toward game a's food
    const h = a.snake[0];
    const dir = h.x < a.food.x ? 'right' : h.x > a.food.x ? 'left'
      : h.y < a.food.y ? 'down' : 'up';
    setDirection(a, dir); setDirection(b, dir);
    const before = a.score;
    step(a); step(b);
    if (a.score !== before) { seqA.push({ ...a.food }); seqB.push({ ...b.food }); }
  }
  assert.ok(a.score >= 3, 'snake should eat at least 3 times');
  assert.deepEqual(seqA, seqB);
  const distinct = new Set(seqA.map((f) => `${f.x},${f.y}`));
  assert.ok(distinct.size >= 3);
});
