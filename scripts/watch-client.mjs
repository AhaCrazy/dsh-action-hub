/**
 * Rebuild client.js whenever a fragment under src/client changes.
 *
 *   npm run dev
 *
 * Keep this running while editing; DSH reloads the generated client.js through
 * its normal plugin HMR path.
 */
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = path.join(root, 'src', 'client');
let timer = null;
let building = false;
let pending = false;

function build() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const child = spawn(process.execPath, [path.join(root, 'scripts', 'build-client.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    building = false;
    if (code !== 0) process.stderr.write(`build failed with exit code ${code}\n`);
    if (pending) {
      pending = false;
      build();
    }
  });
}

build();
watch(source, { recursive: true }, () => {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    build();
  }, 120);
});
process.stdout.write(`watching ${source}\n`);
