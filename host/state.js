/**
 * Host-side skill sources: the standard library plus bundled read-only skills.
 *
 * @module dsh-action-hub/host/state
 */
import path from 'node:path';

import { loadBuiltinActions } from '../builtins.js';
import { sortActions } from '../store.js';

let builtinPromise = null;

/** Load bundled read-only skills once per Host process. */
export function getBuiltins() {
  if (builtinPromise === null) builtinPromise = loadBuiltinActions().catch(() => []);
  return builtinPromise;
}

export async function isBuiltinId(id) {
  return (await getBuiltins()).some((action) => action.id === id);
}

function decorateBuiltin(action, entry) {
  const next = {
    ...action,
    mode: 'command',
    pinned: entry?.pinned === true,
    usage: entry?.usage ?? { count: 0, lastAt: 0 },
    groups: [],
    category: entry?.category ?? '内置',
  };
  Object.defineProperty(next, 'builtinDir', { value: action.dir, enumerable: false });
  return next;
}

export async function readAll(store) {
  const builtins = await getBuiltins();
  const state = await store.read({ keep: builtins.map((action) => action.id), prune: true });
  const ids = new Set(builtins.map((action) => action.id));
  return {
    state,
    invalid: state.invalid ?? [],
    builtins,
    groups: state.state.groups,
    projects: state.state.projects,
    defaultGroup: state.state.defaultGroup ?? '',
    actions: sortActions([
      ...state.actions.filter((action) => !ids.has(action.id)),
      ...builtins.map((action) => decorateBuiltin(action, state.state.entries[action.id])),
    ]),
  };
}

/** Resource directory for a user or built-in skill. */
export function actionResourceDir(action) {
  return typeof action.dir === 'string' && action.dir !== '' ? action.dir : path.join('');
}

/** v6 is a clean break; only a small legacy marker cleanup remains. */
export async function cleanupLegacyBuiltins() {
  return undefined;
}
