import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(
  new URL('../packages/app/src/screens/ParentScreens.tsx', import.meta.url),
  'utf8',
);
const css = readFileSync(new URL('../packages/app/src/styles/server.css', import.meta.url), 'utf8');

test('report profile and period selectors share a wrapping, compact toolbar', () => {
  const report = screen.slice(screen.indexOf('function ProfileReport('));
  assert.match(report, /className="report-toolbar">\s*\{selector\}\s*<label>\s*기간/);
  assert.match(
    screen,
    /<ProfileReport key=\{profileId\} profileId=\{profileId\} selector=\{selector\}/,
  );
  assert.match(css, /\.report-toolbar \{[^}]*display: flex;[^}]*flex-wrap: wrap;/);
  assert.match(css, /\.report-toolbar > label \{[^}]*flex: 0 1 220px;/);
  for (const period of ['7d', '30d', '90d']) {
    assert.ok(report.includes(`value="${period}"`));
  }
});

test('report spacing overrides stay scoped to report cards and chart', () => {
  assert.match(screen, /className="cards stats report-stats"/);
  assert.match(screen, /className="panel report-timeline"/);
  assert.match(css, /\.api-page \.report-stats > \.panel \{[^}]*min-height: 0;/);
  assert.match(css, /\.api-page \.report-timeline > \.section-title \{[^}]*margin: 0 0 12px;/);
});
