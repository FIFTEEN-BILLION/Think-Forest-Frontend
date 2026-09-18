import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

// The sibling docs snapshot is exported from backend.app.main.app.openapi().
const input = process.argv[2] ?? new URL('../../docs/openapi.json', import.meta.url);
const document = JSON.parse(await readFile(input, 'utf8'));
const quote = (value) => JSON.stringify(value);
function type(schema = {}) {
  if (schema.$ref) return `ApiSchema[${quote(schema.$ref.split('/').at(-1))}]`;
  if (schema.const !== undefined) return quote(schema.const);
  if (schema.enum) return schema.enum.map(quote).join(' | ') || 'never';
  if (schema.anyOf || schema.oneOf) return (schema.anyOf ?? schema.oneOf).map(type).join(' | ');
  if (schema.allOf) return schema.allOf.map(type).join(' & ');
  if (schema.type === 'array') return `Array<${type(schema.items)}>`;
  if (schema.type === 'null') return 'null';
  if (schema.type === 'boolean') return 'boolean';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'string') return 'string';
  if (schema.type === 'object' || schema.properties) {
    if (!schema.properties)
      return `Record<string, ${typeof schema.additionalProperties === 'object' ? type(schema.additionalProperties) : 'unknown'}>`;
    return `{${Object.entries(schema.properties)
      .map(
        ([key, value]) =>
          `${quote(key)}${schema.required?.includes(key) ? '' : '?'}: ${type(value)};`,
      )
      .join('\n')}}`;
  }
  return 'unknown';
}
const source = `// Generated from the local backend OpenAPI contract. Regenerate with scripts/generate-api.mjs.
export interface ApiSchema {
${Object.entries(document.components.schemas)
  .map(([name, schema]) => `${quote(name)}: ${type(schema)};`)
  .join('\n')}
}
export type Model<K extends keyof ApiSchema> = ApiSchema[K];
`;
const target = new URL('../packages/app/src/api/schema.ts', import.meta.url);
await writeFile(
  target,
  await format(source, { parser: 'typescript', singleQuote: true, printWidth: 100 }),
);
console.log(
  `Generated ${Object.keys(document.components.schemas).length} API models in ${fileURLToPath(target)}`,
);
