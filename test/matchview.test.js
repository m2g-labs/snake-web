import test from 'node:test';
import assert from 'node:assert/strict';
import { hudText, winsText, roundResult, matchResult, disconnectText, countdownSeconds, reasonText } from '../src/matchview.js';

const end = (winner) => ({ winner, scores: { p1: 5, p2: 3 }, wins: { p1: 1, p2: 0 } });

test('hud and wins text', () => {
  assert.equal(winsText(1, 0), 'You 1 – 0 Opp');
  assert.match(hudText(4, 2, 1, 0), /You 4/);
  assert.match(hudText(4, 2, 1, 0), /Opp 2/);
  assert.match(hudText(4, 2, 1, 0), /You 1 – 0 Opp/);
});

test('round results relative to slot', () => {
  assert.equal(roundResult(end('p1'), 'p1').title, 'You win the round!');
  assert.equal(roundResult(end('p1'), 'p2').title, 'You lose the round');
  assert.equal(roundResult(end('draw'), 'p1').title, 'Draw – replay');
  const r = roundResult(end('p1'), 'p2');
  assert.match(r.msg, /Score: 3 – 5/);
  assert.match(r.msg, /You 0 – 1 Opp/);
});

test('match results', () => {
  assert.equal(matchResult({ winner: 'p2', reason: 'forfeit' }, 'p2').title, 'You win the match!');
  assert.equal(matchResult({ winner: 'p2', reason: 'forfeit' }, 'p1').title, 'You lose the match');
  assert.match(matchResult({ winner: 'p2', reason: 'forfeit' }, 'p1').msg, /forfeit/);
  assert.equal(reasonText('custom'), 'custom');
});

test('disconnect and countdown', () => {
  assert.equal(disconnectText(15), 'Opponent disconnected – 15s');
  assert.equal(disconnectText(-1), 'Opponent disconnected – 0s');
  assert.equal(countdownSeconds(3000, 0), 3);
  assert.equal(countdownSeconds(2100, 0), 3);
  assert.equal(countdownSeconds(0, 500), 0);
  assert.equal(countdownSeconds(99999, 0), 10);
});
