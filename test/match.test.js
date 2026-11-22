import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, addPlayer, startRound, reportScore, reportDeath, forfeit } from '../src/match.js';
import { encode, decode } from '../src/protocol.js';

const mk = () => { const m = createMatch({ level: 3 }); addPlayer(m, 'a'); addPlayer(m, 'b'); return m; };
const round = (m, s1, s2) => { startRound(m, 1); reportScore(m, 'p2', s2); return reportDeath(m, 'p1', s1); };

test('2-0 match', () => {
  const m = mk();
  round(m, 1, 5);
  const ev = round(m, 0, 3);
  assert.equal(m.phase, 'over'); assert.equal(m.winner, 'p2'); assert.equal(m.round, 2);
  assert.deepEqual(ev.at(-1), { type: 'matchEnd', winner: 'p2', reason: 'score' });
});

test('2-1 match', () => {
  const m = mk();
  round(m, 1, 5); round(m, 7, 2);
  assert.equal(m.phase, 'between');
  round(m, 0, 4);
  assert.equal(m.phase, 'over'); assert.equal(m.winner, 'p2'); assert.equal(m.round, 3);
  assert.deepEqual(m.wins, { p1: 1, p2: 2 });
});

test('draw replays round', () => {
  const m = mk();
  const ev = round(m, 4, 4);
  assert.equal(ev[0].winner, 'draw'); assert.equal(m.round, 1); assert.equal(m.phase, 'between');
  startRound(m, 2);
  assert.equal(m.round, 1); assert.equal(m.phase, 'playing');
  assert.deepEqual(m.scores, { p1: 0, p2: 0 });
});

test('lower-score death loses', () => {
  const m = mk();
  const ev = round(m, 2, 6);
  assert.equal(ev[0].type, 'roundEnd'); assert.equal(ev[0].winner, 'p2');
  assert.deepEqual(m.wins, { p1: 0, p2: 1 });
});

test('forfeit', () => {
  const m = mk(); startRound(m, 1);
  const ev = forfeit(m, 'p1');
  assert.deepEqual(ev, [{ type: 'matchEnd', winner: 'p2', reason: 'forfeit' }]);
  assert.equal(m.phase, 'over');
});

test('third player and duplicate/late reports rejected', () => {
  const m = mk();
  assert.equal(addPlayer(m, 'c'), null);
  startRound(m, 1);
  assert.equal(reportDeath(m, 'p1', 1).length, 1);
  assert.deepEqual(reportDeath(m, 'p1', 1), []);
  assert.deepEqual(reportDeath(m, 'p2', 9), []);
  assert.deepEqual(reportScore(m, 'p2', 9), []);
});

const samples = [
  { type: 'hello', token: 't' }, { type: 'score', score: 3 }, { type: 'dead', score: 0 }, { type: 'ready' },
  { type: 'welcome', slot: 'p1', token: 't', code: 'ABCD' }, { type: 'opponentJoined' },
  { type: 'roundStart', round: 1, seed: 42, level: 5, startsAt: 1700000000000 },
  { type: 'opponentScore', score: 2 },
  { type: 'roundEnd', winner: 'draw', scores: { p1: 1, p2: 1 }, wins: { p1: 0, p2: 0 } },
  { type: 'matchEnd', winner: 'p1', reason: 'forfeit' },
  { type: 'opponentLeft', graceMs: 5000 }, { type: 'opponentBack' }, { type: 'error', reason: 'full' },
];

test('decode round-trips valid types', () => {
  for (const s of samples) assert.deepEqual(decode(encode(s)), s);
});

test('decode rejects bad input', () => {
  for (const bad of ['{nope', 'null', '[]', '{"type":"zzz"}', '{"type":"constructor"}',
    '{"type":"score","score":-1}', '{"type":"score","score":1.5}', '{"type":"score","score":"3"}',
    '{"type":"dead"}', JSON.stringify({ type: 'hello', token: 'x'.repeat(5000) }), undefined, 5])
    assert.equal(decode(bad), null, String(bad));
});
