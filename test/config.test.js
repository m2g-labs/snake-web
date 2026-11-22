import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRelayUrl, DEFAULT_RELAY_URL, RELAY_URL } from '../src/config.js';

test('prefers valid ?relay=', () => {
  assert.equal(resolveRelayUrl('?relay=http://localhost:8787/'), 'http://localhost:8787');
});
test('falls back on missing/invalid', () => {
  assert.equal(resolveRelayUrl(''), DEFAULT_RELAY_URL);
  assert.equal(resolveRelayUrl('?relay=nonsense'), DEFAULT_RELAY_URL);
  assert.equal(resolveRelayUrl('?relay=javascript:alert(1)'), DEFAULT_RELAY_URL);
  assert.equal(RELAY_URL, DEFAULT_RELAY_URL);
});
