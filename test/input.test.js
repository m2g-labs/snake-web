import test from 'node:test';
import assert from 'node:assert/strict';
import { keyToAction, shouldPreventDefault } from '../src/input.js';

test('arrows and WASD map to directions', () => {
  assert.deepEqual(keyToAction('ArrowUp', 'running'), { type: 'dir', dir: 'up' });
  assert.deepEqual(keyToAction('a', 'running'), { type: 'dir', dir: 'left' });
  assert.deepEqual(keyToAction('D', 'running'), { type: 'dir', dir: 'right' });
  assert.deepEqual(keyToAction('s', 'running'), { type: 'dir', dir: 'down' });
});
test('space/p pause and resume', () => {
  assert.deepEqual(keyToAction(' ', 'running'), { type: 'pause' });
  assert.deepEqual(keyToAction('P', 'paused'), { type: 'pause' });
  assert.equal(keyToAction('p', 'over'), null);
});
test('enter/space start and restart', () => {
  assert.deepEqual(keyToAction('Enter', 'start'), { type: 'start' });
  assert.deepEqual(keyToAction(' ', 'over'), { type: 'start' });
  assert.equal(keyToAction('Enter', 'running'), null);
  assert.equal(keyToAction('x', 'running'), null);
});
test('arrows and space prevent default', () => {
  assert.ok(shouldPreventDefault('ArrowDown'));
  assert.ok(shouldPreventDefault(' '));
  assert.ok(!shouldPreventDefault('x'));
});
