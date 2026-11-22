import test from 'node:test';
import assert from 'node:assert/strict';
import { connect, createRoom } from '../src/net.js';
import { route } from '../server/routes.js';

test('client URLs are accepted by the relay router', async () => {
  const urls = [];
  class FakeWS {
    constructor(url) { urls.push(url); }
    send() {}
    close() {}
  }
  const storage = { getItem: () => null, setItem() {} };
  for (const relayUrl of ['wss://r.example', 'https://r.example/']) {
    urls.length = 0;
    connect({ relayUrl, code: 'ABCDE', WebSocketImpl: FakeWS, storage });
    const wsUrl = urls[0].replace(/^wss:/, 'https:');
    const r = route(new Request(wsUrl, { headers: { Upgrade: 'websocket' } }));
    assert.equal(r.action, 'ws', wsUrl);
    assert.equal(r.code, 'ABCDE');
  }

  let call;
  await createRoom({
    relayUrl: 'https://r.example',
    fetchImpl: async (u, o) => { call = { u, method: o.method }; return { ok: true, json: async () => ({ code: 'ABCDE' }) }; },
  });
  const r = route(new Request(call.u, { method: call.method }));
  assert.equal(r.action, 'create');
});
