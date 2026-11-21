import test from 'node:test';
import assert from 'node:assert/strict';
import { placeholder } from '../src/game.js';

test('smoke: game module loads', () => {
  assert.equal(placeholder(), 'snake');
});
