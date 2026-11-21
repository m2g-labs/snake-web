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
