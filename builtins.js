/**
 * dsh-action-hub — read-only built-in Actions.
 *
 * Built-ins are ordinary Action directories shipped inside the plugin package:
 *
 *   builtin-actions/<folder>/action.json
 *   builtin-actions/<folder>/files/...
 *
 * They use the same document shape as exported bundles, so they can carry
 * resources and are parsed with the same normalizer as user Actions. The loader
 * never writes to the user data directory and caches the parsed result for the
 * lifetime of the Host process.
 *
 * @module dsh-action-hub/builtins
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listResources } from './resources.js';
import { normalizeAction, validateAction } from './store.js';

const DEFAULT_ROOT = fileURLToPath(new URL('./builtin-actions/', import.meta.url));

const cache = new Map();

/** @returns {string} absolute path of the bundled built-in Actions directory. */
export function defaultBuiltinRoot() {
  return DEFAULT_ROOT;
}

/**
 * Load every valid built-in Action directory under `root`.
 *
 * Invalid or unreadable entries are skipped rather than failing startup, so one
 * malformed built-in cannot take down the library.
 *
 * @param {string} [root]
 * @returns {Promise<object[]>}
 */
export async function loadBuiltinActions(root = DEFAULT_ROOT) {
  if (cache.has(root)) return cache.get(root);
  const actions = [];
  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    cache.set(root, actions);
    return actions;
  }
  const seen = new Set();
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const dir = path.join(root, entry.name);
    let action;
    try {
      const document = JSON.parse(await fs.readFile(path.join(dir, 'action.json'), 'utf8'));
      const raw = document !== null && typeof document === 'object' && document.action !== null && typeof document.action === 'object'
        ? document.action
        : document;
      const files = await listResources(path.join(dir, 'files'));
      action = normalizeAction({ ...raw, resources: files });
    } catch {
      continue;
    }
    if (!validateAction(action).ok || seen.has(action.id)) continue;
    seen.add(action.id);
    action.builtin = true;
    Object.defineProperty(action, 'builtinDir', { value: dir, enumerable: false });
    actions.push(action);
  }
  cache.set(root, actions);
  return actions;
}

/** Test seam: clear the per-root cache. */
export function clearBuiltinCache() {
  cache.clear();
}
