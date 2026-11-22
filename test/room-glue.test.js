import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const hooks = `
export async function resolve(s, c, n) {
  if (s === 'cloudflare:workers') return { url: 'data:text/javascript,export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }', shortCircuit: true };
  return n(s, c);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));
const { Room, codeFromPath } = await import('../server/room.js');

function fakeSocket() {
  return { sent: [], att: null, closed: false,
    send(m) { this.sent.push(JSON.parse(m)); }, close() { this.closed = true; },
    serializeAttachment(a) { this.att = a; }, deserializeAttachment() { return this.att; } };
}
function fakeCtx(sockets) {
  const store = new Map();
  return { getWebSockets: () => sockets,
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, structuredClone(v)); }, setAlarm() {}, deleteAll: async () => store.clear() } };
}

test('codeFromPath takes the segment before /ws', () => {
  assert.equal(codeFromPath('/rooms/ABCDE/ws'), 'ABCDE');
  assert.equal(codeFromPath('/x'), '');
});

test('hello sender receives welcome; reconnect before close gets opponentBack', async () => {
  const socks = [];
  const room = new Room(fakeCtx(socks), {});
  await room.ctx.storage.put('code', 'ABCDE');
  const a = fakeSocket(); a.att = { slot: null }; socks.push(a);
  await room.webSocketMessage(a, JSON.stringify({ type: 'hello', level: 3 }));
  assert.equal(a.sent[0].type, 'welcome');
  assert.equal(a.sent[0].slot, 'p1');
  assert.equal(a.sent[0].code, 'ABCDE');
  const b = fakeSocket(); b.att = { slot: null }; socks.push(b);
  await room.webSocketMessage(b, JSON.stringify({ type: 'hello' }));
  assert.equal(b.sent[0].slot, 'p2');
  const a2 = fakeSocket(); a2.att = { slot: null }; socks.push(a2);
  await room.webSocketMessage(a2, JSON.stringify({ type: 'hello', token: a.sent[0].token }));
  assert.equal(a2.sent[0].type, 'welcome');
  assert.equal(a2.sent[0].slot, 'p1');
  assert.ok(b.sent.some((m) => m.type === 'opponentBack'));
  assert.ok(a.closed);
});
