import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('#overlay background is opaque', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const m = css.match(/#overlay\s*\{([^}]*)\}/);
  assert.ok(m, '#overlay rule exists');
  const bg = m[1].match(/background(?:-color)?\s*:\s*([^;]+)/);
  assert.ok(bg, 'background declared');
  const v = bg[1].trim().toLowerCase();
  assert.notEqual(v, 'transparent');
  const rgba = v.match(/^rgba\(([^)]*)\)$/);
  if (rgba) assert.ok(parseFloat(rgba[1].split(',')[3]) >= 1, 'alpha must be 1');
});

test('board size select options match BOARD_SIZES', async () => {
  const { BOARD_SIZES, BOARD_SIZE_DEFAULT } = await import('../src/board.js');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const sel = html.match(/<select id="board-size-select">([\s\S]*?)<\/select>/);
  assert.ok(sel);
  const opts = [...sel[1].matchAll(/<option value="(\d+)"( selected)?>(\d+)×(\d+)<\/option>/g)];
  assert.deepEqual(opts.map((m) => Number(m[1])), BOARD_SIZES);
  for (const m of opts) assert.equal(m[3], m[1]), assert.equal(m[4], m[1]);
  assert.equal(opts.filter((m) => m[2]).map((m) => Number(m[1])).join(), String(BOARD_SIZE_DEFAULT));
});
