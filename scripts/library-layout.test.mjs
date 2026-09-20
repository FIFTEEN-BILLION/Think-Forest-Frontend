import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('../packages/app/src/styles/server.css', import.meta.url), 'utf8');

test('library covers keep a uniform, non-shrinking height on desktop and mobile', () => {
  const covers = [...css.matchAll(/\.api-page \.library-story-grid \.book-cover \{([^}]+)\}/g)];
  assert.equal(covers.length, 2);
  for (const [index, [, declarations]] of covers.entries()) {
    const height = index === 0 ? 224 : 208;
    assert.match(declarations, new RegExp(`\\bheight: ${height}px;`));
    assert.match(declarations, new RegExp(`min-height: ${height}px;`));
  }
  assert.match(covers[0][1], /flex-shrink: 0;/);
  assert.match(covers[0][1], /box-sizing: border-box;/);
});

test('long library titles stay within two lines and keep their full tooltip', () => {
  const heading = css.match(/\.api-page \.library-story-grid \.book-cover h3 \{([^}]+)\}/)[1];
  assert.match(heading, /-webkit-line-clamp: 2;/);
  assert.match(heading, /overflow: hidden;/);
  assert.match(heading, /overflow-wrap: anywhere;/);
  const screen = readFileSync(
    new URL('../packages/app/src/screens/ReaderScreens.tsx', import.meta.url),
    'utf8',
  );
  assert.match(screen, /title=\{s\.title\}/);
});
