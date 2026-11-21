import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSwipe } from '../src/swipe.js';

test('four directions', () => {
  assert.equal(detectSwipe(50, 5), 'right');
  assert.equal(detectSwipe(-50, 5), 'left');
  assert.equal(detectSwipe(5, 50), 'down');
  assert.equal(detectSwipe(5, -50), 'up');
});
test('below threshold is null', () => {
  assert.equal(detectSwipe(10, 10), null);
  assert.equal(detectSwipe(0, 0), null);
});
test('threshold boundary and custom threshold', () => {
  assert.equal(detectSwipe(30, 0), 'right');
  assert.equal(detectSwipe(29, 0), null);
  assert.equal(detectSwipe(0, -10, 10), 'up');
});
test('dominant axis wins', () => {
  assert.equal(detectSwipe(40, -60), 'up');
});
