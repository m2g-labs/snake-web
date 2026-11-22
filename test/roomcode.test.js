import test from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABET, CODE_LENGTH, generateCode, normalizeCode } from '../src/roomcode.js';

test('alphabet is unambiguous', () => {
  for (const c of '0O1I') assert.ok(!ALPHABET.includes(c));
});
test('generateCode length and alphabet', () => {
  for (let i = 0; i < 200; i++) {
    const c = generateCode();
    assert.equal(c.length, CODE_LENGTH);
    for (const ch of c) assert.ok(ALPHABET.includes(ch));
  }
});
test('normalizeCode', () => {
  assert.equal(normalizeCode(' ab3cd '), 'AB3CD');
  assert.equal(normalizeCode('AB3C'), null);
  assert.equal(normalizeCode('AB3C0'), null);
  assert.equal(normalizeCode('ABCDEF'), null);
  assert.equal(normalizeCode(null), null);
});
