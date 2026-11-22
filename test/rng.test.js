import test from 'node:test';
import assert from 'node:assert/strict';
import { seededRng, randomSeed } from '../src/rng.js';
import { createGame, step } from '../src/game.js';

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

test('two seeded games produce identical food positions', () => {
  const a = createGame({ rng: seededRng(7) });
  const b = createGame({ rng: seededRng(7) });
  const foods = [[], []];
  for (let i = 0; i < 200 && !a.gameOver; i++) {
    foods[0].push(a.food && { ...a.food });
    foods[1].push(b.food && { ...b.food });
    step(a); step(b);
  }
  assert.deepEqual(foods[0], foods[1]);
  assert.deepEqual(a.food, b.food);
});
