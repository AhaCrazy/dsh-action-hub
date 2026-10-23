/**
 * Host-side Action sources: user store plus bundled read-only built-ins.
 *
 * @module dsh-action-hub/host/state
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { loadBuiltinActions } from '../builtins.js';
import { readBuiltinState } from '../builtin-state.js';
import { removeActionDir, resourceDir } from '../resources.js';
import { sortActions } from '../store.js';

let builtinPromise = null;

/** Load the bundled read-only Actions once per Host process. */
export function getBuiltins() {
  if (builtinPromise === null) builtinPromise = loadBuiltinActions().catch(() => []);
  return builtinPromise;
}

export async function isBuiltinId(id) {
  return (await getBuiltins()).some((action) => action.id === id);
}

function decorateBuiltin(action, builtinState) {
  const next = {
    ...action,
    pinned: builtinState?.pinned?.[action.id] === true,
    usage: builtinState?.usage?.[action.id] ?? {},
  };
  Object.defineProperty(next, 'builtinDir', { value: action.builtinDir, enumerable: false });
  return next;
}

/**
 * Read the user store, bundled built-ins, and built-in preferences together.
 *
 * @param {ReturnType<import('../store.js').createStore>} store
 * @param {string} dataDir
 */
export async function readAll(store, dataDir) {
  const [state, builtins, builtinState] = await Promise.all([
    store.read(),
    getBuiltins(),
    readBuiltinState(dataDir),
  ]);
  const ids = new Set(builtins.map((action) => action.id));
  return {
    state,
    builtins,
    builtinState,
    actions: sortActions([
      ...state.actions.filter((action) => !ids.has(action.id)),
      ...builtins.map((action) => decorateBuiltin(action, builtinState)),
    ]),
  };
}

/** Resource directory for a user or built-in Action. */
export function actionResourceDir(action, dataDir) {
  return action.builtin === true && typeof action.builtinDir === 'string'
    ? path.join(action.builtinDir, 'files')
    : resourceDir(dataDir, action.id);
}

/**
 * Remove copies of built-in Actions that older versions persisted into the user
 * data directory, plus the old defaults marker.
 *
 * @param {ReturnType<import('../store.js').createStore>} store
 * @param {string} dataDir
 */
export async function cleanupLegacyBuiltins(store, dataDir) {
  const builtins = await getBuiltins();
  const ids = new Set(builtins.map((action) => action.id));
  if (ids.size === 0) {
    await fs.rm(path.join(dataDir, '.defaults-v1'), { force: true }).catch(() => {});
    return;
  }
  const state = await store.read();
  const present = state.actions.filter((action) => ids.has(action.id));
  if (present.length > 0) {
    await store.mutate((draft) => {
      draft.actions = draft.actions.filter((entry) => !ids.has(entry.id));
    });
    for (const action of present) await removeActionDir(dataDir, action.id);
  }
  await fs.rm(path.join(dataDir, '.defaults-v1'), { force: true }).catch(() => {});
}
