import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, GRACE_MS, COUNTDOWN_MS, IDLE_MS } from '../server/roomcore.js';

function setup() {
  const clock = { t: 1000 };
  const out = [[], []];
  let alarm = null;
  const core = new RoomCore({
    code: 'ABCD', now: () => clock.t, setAlarm: (ms) => { alarm = ms; },
    send: (slot, msg) => out[slot].push(msg), newToken: (() => { let n = 0; return () => `tok${n++}`; })(),
  });
  const j = (o) => JSON.stringify(o);
  const a = core.message(null, j({ type: 'hello', token: null, level: 7 }));
  const b = core.message(null, j({ type: 'hello', token: null }));
  const types = (s) => out[s].map((m) => m.type);
  return { core, clock, out, a, b, j, types, alarm: () => alarm };
}

function startRound(c) {
  c.core.message(c.a, c.j({ type: 'ready' }));
  c.core.message(c.b, c.j({ type: 'ready' }));
}

test('hello assigns slots and notifies opponent', () => {
  const c = setup();
  assert.deepEqual([c.a, c.b], [0, 1]);
  assert.equal(c.out[0][0].slot, 'p1');
  assert.equal(c.out[1][0].token, 'tok1');
  assert.deepEqual(c.types(0), ['welcome', 'opponentJoined']);
});

test('full match flow, score relay, countdown, level', () => {
  const c = setup();
  c.core.message(c.a, c.j({ type: 'ready' }));
  assert.ok(!c.types(0).includes('roundStart'));
  c.core.message(c.b, c.j({ type: 'ready' }));
  const rs = c.out[1].find((m) => m.type === 'roundStart');
  assert.equal(rs.level, 7);
  assert.equal(rs.startsAt, 1000 + COUNTDOWN_MS);
  assert.equal(rs.round, 1);
  assert.deepEqual(c.out[0].find((m) => m.type === 'roundStart'), rs);
  c.core.message(c.a, c.j({ type: 'score', score: 3 }));
  assert.deepEqual(c.out[1].at(-1), { type: 'opponentScore', score: 3 });
  assert.ok(!c.types(0).includes('opponentScore'));
  for (let r = 1; r <= 2; r++) {
    if (r > 1) startRound(c);
    c.core.message(c.a, c.j({ type: 'score', score: 5 }));
    c.core.message(c.a, c.j({ type: 'dead', score: 5 }));
    c.core.message(c.b, c.j({ type: 'dead', score: 1 }));
  }
  const end = c.out[0].at(-1);
  assert.deepEqual(end, { type: 'matchEnd', winner: 'p1', reason: 'score' });
  assert.equal(c.types(1).filter((t) => t === 'roundEnd').length, 2);
});

test('draw replays with a new seed after both ready', () => {
  const c = setup();
  startRound(c);
  const s1 = c.out[0].find((m) => m.type === 'roundStart');
  c.core.message(c.b, c.j({ type: 'score', score: 2 }));
  c.core.message(c.a, c.j({ type: 'dead', score: 2 }));
  assert.equal(c.out[0].at(-1).winner, 'draw');
  c.core.message(c.a, c.j({ type: 'ready' }));
  assert.equal(c.types(0).filter((t) => t === 'roundStart').length, 1);
  c.core.message(c.b, c.j({ type: 'ready' }));
  const starts = c.out[0].filter((m) => m.type === 'roundStart');
  assert.equal(starts.length, 2);
  assert.equal(starts[1].round, 1);
  assert.notEqual(starts[1].seed, s1.seed);
});

test('reconnect within grace restores slot', () => {
  const c = setup();
  c.core.disconnect(0);
  assert.deepEqual(c.out[1].at(-1), { type: 'opponentLeft', graceMs: GRACE_MS });
  assert.equal(c.alarm(), 1000 + GRACE_MS);
  c.clock.t += 5000;
  const slot = c.core.message(null, c.j({ type: 'hello', token: 'tok0' }));
  assert.equal(slot, 0);
  assert.equal(c.out[1].at(-1).type, 'opponentBack');
  c.clock.t += GRACE_MS;
  assert.equal(c.core.alarm(), false);
  assert.ok(!c.types(1).includes('matchEnd'));
});

test('grace expiry forfeits', () => {
  const c = setup();
  startRound(c);
  c.core.disconnect(0);
  c.clock.t += GRACE_MS;
  c.core.alarm();
  assert.deepEqual(c.out[1].at(-1), { type: 'matchEnd', winner: 'p2', reason: 'forfeit' });
});

test('wrong token rejected; invalid messages dropped', () => {
  const c = setup();
  c.core.disconnect(0);
  assert.equal(c.core.message(null, c.j({ type: 'hello', token: 'nope' })), null);
  assert.equal(c.core.message(null, c.j({ type: 'hello', token: null })), null); // slot still reserved
  const n = c.out[1].length;
  assert.equal(c.core.message(c.b, 'garbage'), 1);
  assert.equal(c.core.message(c.b, c.j({ type: 'score', score: -1 })), 1);
  assert.equal(c.core.message(null, c.j({ type: 'ready' })), null);
  assert.equal(c.out[1].length, n);
});

test('idle room expires; state is serialisable', () => {
  const c = setup();
  JSON.parse(JSON.stringify(c.core.state));
  c.clock.t += IDLE_MS;
  assert.equal(c.core.alarm(), true);
});
