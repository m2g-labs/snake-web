import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCode, parseJoinParam, buildShareUrl, errorText } from '../src/lobby.js';

test('normalizeCode', () => {
  assert.equal(normalizeCode(' ab3cd '), 'AB3CD');
  assert.equal(normalizeCode('abc'), null);
  assert.equal(normalizeCode('abcdef'), null);
  assert.equal(normalizeCode(null), null);
});
test('parseJoinParam pre-fills uppercase', () => {
  assert.equal(parseJoinParam('?join=ab3cd'), 'AB3CD');
  assert.equal(parseJoinParam('?x=1&join=ab3cd'), 'AB3CD');
  assert.equal(parseJoinParam('?join=zz'), null);
  assert.equal(parseJoinParam(''), null);
});
test('buildShareUrl uses current page path', () => {
  assert.equal(buildShareUrl('AB3CD', 'https://x.github.io/snake-web/?join=OLD#h'), 'https://x.github.io/snake-web/?join=AB3CD');
  assert.equal(buildShareUrl('AB3CD', 'http://localhost:8000/index.html'), 'http://localhost:8000/index.html?join=AB3CD');
});
test('errorText', () => {
  assert.match(errorText('room_full'), /full/);
  assert.match(errorText('room not found'), /not found/);
  assert.match(errorText(''), /unreachable/);
  assert.match(errorText('create_failed'), /create/);
  assert.match(errorText('connect_failed'), /connect/);
  assert.notEqual(errorText('create_failed'), errorText('connect_failed'));
});
