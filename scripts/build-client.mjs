/**
 * Build the browser bundle that DSH loads.
 *
 * The Web client is a single `window.__ModuleLoader__.load(...)` factory, so the
 * source is split into ordered fragments under `src/client/` and concatenated
 * into `client.js`. Fragments share the factory scope, which keeps the runtime
 * contract unchanged while allowing small, focused files during development.
 *
 *   node scripts/build-client.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = path.join(root, 'src', 'client');
const output = path.join(root, 'client.js');

const files = (await readdir(source))
  .filter((name) => /^\d{2}-.+\.js$/u.test(name))
  .sort((left, right) => left.localeCompare(right, 'en'));

if (files.length === 0) throw new Error('src/client has no numbered fragments');

const parts = await Promise.all(files.map((name) => readFile(path.join(source, name), 'utf8')));
await writeFile(output, parts.join('\n'), 'utf8');
process.stdout.write(`built client.js from ${files.length} fragments\n`);
