import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_SIZES, BOARD_SIZE_DEFAULT, clampBoardSize } from '../src/board.js';

test('valid sizes pass through', () => {
  for (const s of BOARD_SIZES) {
    assert.equal(clampBoardSize(s), s);
    assert.equal(clampBoardSize(String(s)), s);
  }
});
test('invalid falls back to 20', () => {
  assert.equal(BOARD_SIZE_DEFAULT, 20);
  for (const v of [null, undefined, '', 'abc', 17, -5, NaN, '17']) assert.equal(clampBoardSize(v), 20);
});
