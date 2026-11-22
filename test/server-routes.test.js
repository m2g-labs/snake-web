import test from 'node:test';
import assert from 'node:assert/strict';
import { route } from '../server/routes.js';

const req = (path, init) => new Request('https://relay.test' + path, init);

test('POST /rooms creates a code', () => {
  const r = route(req('/rooms', { method: 'POST' }));
  assert.equal(r.action, 'create');
  assert.equal(r.code.length, 5);
});
test('bad path is 404', () => {
  assert.equal(route(req('/nope')).response.status, 404);
  assert.equal(route(req('/rooms/!!/ws')).response.status, 404);
});
test('non-upgrade /ws is 426', () => {
  assert.equal(route(req('/rooms/ab3cd/ws')).response.status, 426);
});
test('upgrade /ws routes to room', () => {
  const r = route(req('/rooms/ab3cd/ws', { headers: { Upgrade: 'websocket' } }));
  assert.deepEqual([r.action, r.code], ['ws', 'AB3CD']);
});
test('CORS allows pages and localhost only', () => {
  const ok = o => route(req('/x', { headers: { Origin: o } })).response.headers.get('Access-Control-Allow-Origin');
  assert.equal(ok('https://m2g-labs.github.io'), 'https://m2g-labs.github.io');
  assert.equal(ok('http://localhost:8000'), 'http://localhost:8000');
  assert.equal(ok('https://evil.com'), null);
});
