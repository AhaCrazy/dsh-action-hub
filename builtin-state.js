/**
 * dsh-action-hub — local preferences for built-in Actions.
 *
 * Built-in Actions themselves are read-only plugin files, but pinning and usage
 * counters are user-local state. They are kept in a small sidecar file inside
 * the user data directory; no built-in Action is ever copied into `actions/`.
 *
 * @module dsh-action-hub/builtin-state
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const FILE_NAME = 'builtin-state.json';

/** @param {string} dataDir */
export function builtinStatePath(dataDir) {
  return path.join(dataDir, FILE_NAME);
}

function emptyState() {
  return { pinned: {}, usage: {} };
}

function normalizeState(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {};
  const pinned = {};
  const usage = {};
  if (source.pinned !== null && typeof source.pinned === 'object') {
    for (const [id, value] of Object.entries(source.pinned)) {
      if (value === true) pinned[id] = true;
    }
  }
  if (source.usage !== null && typeof source.usage === 'object') {
    for (const [id, value] of Object.entries(source.usage)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) usage[id] = value;
    }
  }
  return { pinned, usage };
}

/** @param {string} dataDir */
export async function readBuiltinState(dataDir) {
  try {
    return normalizeState(JSON.parse(await fs.readFile(builtinStatePath(dataDir), 'utf8')));
  } catch {
    return emptyState();
  }
}

/** @param {string} dataDir @param {{ pinned: object, usage: object }} state */
export async function writeBuiltinState(dataDir, state) {
  const target = builtinStatePath(dataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(temp, `${JSON.stringify(normalizeState(state), null, 2)}\n`, 'utf8');
  await fs.rename(temp, target);
}

let writeQueue = Promise.resolve();

/**
 * Serialize mutations so two rapid touches cannot overwrite each other.
 *
 * @param {string} dataDir
 * @param {(state: { pinned: object, usage: object }) => (object | void | Promise<object | void>)} mutate
 * @returns {Promise<{ pinned: object, usage: object }>}
 */
export async function updateBuiltinState(dataDir, mutate) {
  const run = writeQueue.then(async () => {
    const state = await readBuiltinState(dataDir);
    const next = await mutate(state);
    const final = next !== null && typeof next === 'object' ? next : state;
    await writeBuiltinState(dataDir, final);
    return normalizeState(final);
  });
  writeQueue = run.catch(() => {});
  return run;
}
