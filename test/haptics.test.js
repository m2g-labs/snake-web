import test from 'node:test';
import assert from 'node:assert/strict';
import { vibrate, HAPTIC_EAT, HAPTIC_OVER } from '../src/haptics.js';

test('constants', () => {
  assert.equal(HAPTIC_EAT, 30);
  assert.deepEqual(HAPTIC_OVER, [80, 40, 120]);
});
test('calls vibrate when supported', () => {
  const calls = [];
  const nav = { vibrate: (p) => { calls.push(p); return true; } };
  assert.equal(vibrate(HAPTIC_EAT, nav), true);
  assert.deepEqual(calls, [30]);
});
test('unsupported does not throw', () => {
  assert.equal(vibrate(30, {}), false);
  assert.equal(vibrate(30, undefined), false);
  assert.equal(vibrate(30, null), false);
});
test('throwing vibrate is swallowed', () => {
  assert.equal(vibrate(30, { vibrate() { throw new Error('x'); } }), false);
});
