import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('favicon, manifest, theme-color use relative paths and exist', () => {
  for (const re of [/rel="icon" href="([^"]+)"/, /rel="manifest" href="([^"]+)"/]) {
    const m = html.match(re);
    assert.ok(m);
    assert.ok(!m[1].startsWith('/') && !m[1].includes('://'));
    assert.ok(existsSync(new URL('../' + m[1], import.meta.url)));
  }
  assert.match(html, /name="theme-color"/);
});

test('manifest has relative paths', () => {
  const m = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(m.start_url, './');
  for (const i of m.icons) assert.ok(existsSync(new URL('../' + i.src, import.meta.url)));
});
