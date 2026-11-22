import test from 'node:test';
import assert from 'node:assert/strict';
import { connect, createRoom } from '../src/net.js';

function setup(opts = {}) {
  let t = 0; const timers = [];
  const socks = [];
  class FakeWS {
    constructor(url) { this.url = url; this.sent = []; this.readyState = 0; socks.push(this); }
    send(d) { this.sent.push(JSON.parse(d)); }
    close() { this.readyState = 3; }
    open() { this.readyState = 1; this.onopen(); }
    msg(d) { this.onmessage({ data: typeof d === 'string' ? d : JSON.stringify(d) }); }
    drop() { this.readyState = 3; this.onclose(); }
  }
  const store = {}; 
  const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const advance = (ms) => {
    const end = t + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      if (!timers.length || timers[0].at > end) break;
      const x = timers.shift(); t = x.at; x.fn();
    }
    t = end;
  };
  const net = connect({
    relayUrl: 'https://r.example', code: 'ABCD', WebSocketImpl: FakeWS, storage,
    setTimeoutImpl: (fn, ms) => { const x = { fn, at: t + ms }; timers.push(x); return x; },
    clearTimeoutImpl: (x) => { const i = timers.indexOf(x); if (i >= 0) timers.splice(i, 1); },
    now: () => t, ...opts,
  });
  const statuses = []; net.on('status', (s) => statuses.push(s));
  return { net, socks, statuses, advance, store };
}

test('dispatches decoded messages by type and ignores invalid frames', () => {
  const { net, socks } = setup();
  const got = [];
  net.on('opponentScore', (m) => got.push(m));
  socks[0].open();
  socks[0].msg({ type: 'opponentScore', score: 3 });
  socks[0].msg('not json');
  socks[0].msg({ type: 'bogus' });
  socks[0].msg({ type: 'opponentScore', score: -1 });
  assert.deepEqual(got, [{ type: 'opponentScore', score: 3 }]);
  assert.equal(socks[0].url, 'wss://r.example/rooms/ABCD');
  net.send({ type: 'score', score: 5 });
  assert.deepEqual(socks[0].sent.at(-1), { type: 'score', score: 5 });
});

test('reconnects after unexpected close and resends hello with saved token', () => {
  const { net, socks, statuses, advance, store } = setup();
  socks[0].open();
  socks[0].msg({ type: 'welcome', slot: 'p1', token: 'tok', code: 'ABCD' });
  assert.equal(store['snake-token:ABCD'], 'tok');
  socks[0].drop();
  assert.equal(socks.length, 1);
  advance(500);
  assert.equal(socks.length, 2);
  socks[1].open();
  assert.deepEqual(socks[1].sent[0], { type: 'hello', token: 'tok' });
  assert.deepEqual(statuses, ['open', 'reconnecting', 'open']);
  net.close();
});

test('gives up after 15s and emits failed', () => {
  const { socks, statuses, advance } = setup();
  socks[0].open();
  socks[0].drop();
  for (let i = 0; i < 60 && statuses.at(-1) !== 'failed'; i++) {
    advance(500);
    const s = socks.at(-1); if (s.readyState === 0) s.drop();
  }
  assert.equal(statuses.at(-1), 'failed');
  const n = socks.length;
  advance(60000);
  assert.equal(socks.length, n);
});

test('createRoom handles success and HTTP errors', async () => {
  let url, init;
  const ok = async (u, i) => { url = u; init = i; return { ok: true, json: async () => ({ code: 'WXYZ' }) }; };
  assert.deepEqual(await createRoom({ relayUrl: 'https://r.example/', fetchImpl: ok }), { code: 'WXYZ' });
  assert.equal(url, 'https://r.example/rooms');
  assert.equal(init.method, 'POST');
  await assert.rejects(createRoom({ relayUrl: 'https://r', fetchImpl: async () => ({ ok: false, status: 500 }) }), /500/);
  await assert.rejects(createRoom({ relayUrl: 'https://r', fetchImpl: async () => { throw new Error('net'); } }), /net/);
});
