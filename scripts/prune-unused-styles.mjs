import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import ts from 'typescript';

// Conservative source audit: keep pseudo-function selectors and dynamic class prefixes.
// Run without --write to review; always visually compare after applying the cleanup.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)],
  );
}
const sources = [
  ...files(resolve(root, 'packages/app/src')),
  ...files(resolve(root, 'apps/web/src')),
].filter((f) => /\.tsx$/.test(f) || /(?:catalog|contentAppearance)\.ts$/.test(f));
const source = sources.map((f) => readFileSync(f, 'utf8')).join('\n');
// Identifiers such as `inquiry` or `step` are not CSS class references.
// Only literal values (including template fragments and enum values) can supply classes.
const literals = [];
for (const file of sources) {
  const parsed = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      literals.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
}
const words = new Set(literals.join(' ').match(/[a-zA-Z_][\w-]*/g));
const prefixes = [...source.matchAll(/([a-z][\w-]*-)\$\{/g)].map((m) => m[1]);
const used = (name) => words.has(name) || prefixes.some((prefix) => name.startsWith(prefix));
const report = [];
for (const file of files(resolve(root, 'packages/app/src/styles')).filter((f) =>
  f.endsWith('.css'),
)) {
  const before = readFileSync(file, 'utf8');
  const css = postcss.parse(before, { from: file });
  const removed = [];
  css.walkRules((rule) => {
    if (/:\w+\(/.test(rule.selector)) return;
    const selectors = rule.selectors.filter((selector) => {
      const classes = [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]);
      const keep = classes.every(used);
      if (!keep) removed.push(selector);
      return keep;
    });
    if (!selectors.length) rule.remove();
    else rule.selectors = selectors;
  });
  css.walkAtRules((rule) => {
    if (rule.nodes && !rule.nodes.some((n) => n.type !== 'comment')) rule.remove();
  });
  const after = css.toString();
  report.push({
    file: file.slice(root.length + 1),
    removedSelectors: removed.length,
    bytesRemoved: Buffer.byteLength(before) - Buffer.byteLength(after),
    examples: removed.slice(0, 8),
  });
  if (process.argv.includes('--write')) writeFileSync(file, after);
}
console.log(JSON.stringify(report, null, 2));
