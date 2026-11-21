import test from 'node:test';
import assert from 'node:assert/strict';
import { FOOD_KINDS, createGame } from '../src/game.js';
import { FOOD_ICONS } from '../src/render.js';

const mk = () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

test('food kind in range and deterministic with seeded rng', () => {
  const a = createGame({ rng: mk() }), b = createGame({ rng: mk() });
  assert.deepEqual(a.food, b.food);
  assert.ok(Number.isInteger(a.food.kind) && a.food.kind >= 0 && a.food.kind < FOOD_KINDS);
  assert.equal(createGame({ rng: () => 0.999999 }).food.kind, FOOD_KINDS - 1);
  assert.equal(FOOD_ICONS.length, FOOD_KINDS);
});
