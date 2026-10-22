/**
 * dsh-action-hub — portable Action bundles.
 *
 * Because the 4.0 store is one self-contained directory per Action, a bundle is
 * simply that directory:
 *
 *   <name>/
 *     action.json        format marker + action metadata/prompt + resource list
 *     files/<relative>   resource bytes
 *
 * Export copies the directory (or zips it); import copies it back, allocating a
 * fresh id when the incoming id already exists. The same document is readable by
 * a human, git, or another Action Hub installation.
 *
 * @module dsh-action-hub/bundle
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { actionDir, resourceDir, safeActionFolderName, safeRelativeName } from './resources.js';
import { mintId, normalizeAction } from './store.js';
import { createZip, readZip } from './zip.js';

export const BUNDLE_FORMAT = 'dsh-action-hub/action@1';

async function walkFiles(root, prefix = '', out = []) {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, prefix), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await walkFiles(root, relative, out);
      continue;
    }
    if (entry.isFile()) out.push(relative);
  }
  return out;
}

async function readDocument(dir) {
  const document = JSON.parse(await fs.readFile(path.join(dir, 'action.json'), 'utf8'));
  const raw = document !== null && typeof document === 'object' && document.action !== null && typeof document.action === 'object'
    ? document.action
    : document;
  return normalizeAction(raw);
}

function uniqueId(known, action) {
  if (!known.has(action.id)) return action.id;
  let candidate = mintId(action.name);
  while (known.has(candidate)) candidate = mintId(action.name);
  return candidate;
}

/**
 * Export one Action directory under a user-selected target folder.
 *
 * @param {{ read: Function }} store
 * @param {string} dataDir
 * @param {string} id
 * @param {string} targetRoot
 * @returns {Promise<{ path: string, id: string }>}
 */
export async function exportActionFolder(store, dataDir, id, targetRoot) {
  const state = await store.read();
  const action = state.actions.find((entry) => entry.id === id);
  if (action === undefined) throw new Error('Action 不存在');
  const root = path.resolve(String(targetRoot));
  const info = await fs.stat(root).catch(() => undefined);
  if (info === undefined || !info.isDirectory()) throw new Error('目标目录不存在');
  const dest = path.join(root, safeActionFolderName(action.id));
  if (await fs.access(dest).then(() => true).catch(() => false)) throw new Error('目标目录里已经有同名 Action');
  await fs.cp(actionDir(dataDir, action.id), dest, { recursive: true });
  return { path: dest, id: action.id };
}

/**
 * Export every Action to a new timestamped subfolder.
 *
 * @param {{ read: Function }} store
 * @param {string} dataDir
 * @param {string} targetRoot
 * @returns {Promise<{ path: string, count: number }>}
 */
export async function exportAllFolder(store, dataDir, targetRoot) {
  const state = await store.read();
  const root = path.resolve(String(targetRoot));
  const info = await fs.stat(root).catch(() => undefined);
  if (info === undefined || !info.isDirectory()) throw new Error('目标目录不存在');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(root, `action-hub-export-${stamp}`);
  await fs.mkdir(dest, { recursive: false });
  for (const action of state.actions) {
    await fs.cp(actionDir(dataDir, action.id), path.join(dest, safeActionFolderName(action.id)), { recursive: true });
  }
  return { path: dest, count: state.actions.length };
}

/**
 * Build a ZIP buffer for one Action or the whole library.
 *
 * @param {{ read: Function }} store
 * @param {string} dataDir
 * @param {string} [id] - omit to export every Action.
 * @returns {Promise<{ buffer: Buffer, count: number, filename: string }>}
 */
export async function exportZipBuffer(store, dataDir, id = undefined) {
  const state = await store.read();
  const selected = id === undefined ? state.actions : state.actions.filter((entry) => entry.id === id);
  if (selected.length === 0) throw new Error('Action 不存在');
  const entries = [];
  for (const action of selected) {
    const dir = actionDir(dataDir, action.id);
    const folder = safeActionFolderName(action.id);
    for (const relative of await walkFiles(dir)) {
      entries.push({ name: `${folder}/${relative.replace(/\\/g, '/')}`, data: await fs.readFile(path.join(dir, relative)) });
    }
  }
  return {
    buffer: createZip(entries),
    count: selected.length,
    filename: id === undefined ? 'dsh-action-hub.zip' : `${safeActionFolderName(id)}.zip`,
  };
}

/**
 * Import one or more Action directories from a folder.
 *
 * @param {{ read: Function, mutate: Function }} store
 * @param {string} dataDir
 * @param {string} source
 * @returns {Promise<{ actions: object[], renamed: number, skipped: number }>}
 */
export async function importFolder(store, dataDir, source) {
  const root = path.resolve(String(source));
  const info = await fs.stat(root).catch(() => undefined);
  if (info === undefined || !info.isDirectory()) throw new Error('目录不存在');
  const hasDocument = await fs.access(path.join(root, 'action.json')).then(() => true).catch(() => false);
  const candidates = hasDocument
    ? [root]
    : (await fs.readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name));
  const dirs = [];
  for (const candidate of candidates) {
    if (await fs.access(path.join(candidate, 'action.json')).then(() => true).catch(() => false)) dirs.push(candidate);
  }
  if (dirs.length === 0) throw new Error('目录里没有 action.json');
  const state = await store.read();
  const known = new Set(state.actions.map((action) => action.id));
  const actions = [];
  let renamed = 0;
  let skipped = 0;
  for (const dir of dirs) {
    let raw;
    try {
      raw = await readDocument(dir);
    } catch {
      skipped += 1;
      continue;
    }
    const id = uniqueId(known, raw);
    if (id !== raw.id) renamed += 1;
    known.add(id);
    const action = normalizeAction({ ...raw, id }, { now: Date.now() });
    const filesFrom = path.join(dir, 'files');
    if (await fs.access(filesFrom).then(() => true).catch(() => false)) {
      await fs.cp(filesFrom, resourceDir(dataDir, id), { recursive: true });
    }
    await store.mutate((draft) => {
      draft.actions = [...draft.actions, action];
    });
    actions.push(action);
  }
  return { actions, renamed, skipped };
}

/**
 * Import Action directories from a ZIP buffer.
 *
 * @param {{ read: Function, mutate: Function }} store
 * @param {string} dataDir
 * @param {Buffer} buffer
 * @returns {Promise<{ actions: object[], renamed: number, skipped: number }>}
 */
export async function importZipBuffer(store, dataDir, buffer) {
  const entries = readZip(buffer);
  const groups = new Map();
  for (const [name, data] of entries) {
    const normalized = name.replace(/\\/g, '/');
    const segments = normalized.split('/');
    if (segments.some((segment) => segment === '..' || segment === '')) continue;
    const documentAt = segments.lastIndexOf('action.json');
    if (documentAt < 0 || documentAt !== segments.length - 1) continue;
    const prefix = segments.slice(0, documentAt).join('/');
    if (groups.has(prefix)) continue;
    groups.set(prefix, { action: JSON.parse(data.toString('utf8')) });
  }
  if (groups.size === 0) throw new Error('ZIP 里没有 Action 包');
  const state = await store.read();
  const known = new Set(state.actions.map((action) => action.id));
  const actions = [];
  let renamed = 0;
  let skipped = 0;
  for (const [prefix, group] of groups) {
    const document = group.action;
    const raw = document !== null && typeof document === 'object' && document.action !== null && typeof document.action === 'object'
      ? document.action
      : document;
    let normalized;
    try {
      normalized = normalizeAction(raw);
    } catch {
      skipped += 1;
      continue;
    }
    const id = uniqueId(known, normalized);
    if (id !== normalized.id) renamed += 1;
    known.add(id);
    const action = normalizeAction({ ...normalized, id }, { now: Date.now() });
    const filesPrefix = prefix === '' ? 'files/' : `${prefix}/files/`;
    for (const [name, data] of entries) {
      if (!name.startsWith(filesPrefix)) continue;
      const relative = safeRelativeName(name.slice(filesPrefix.length));
      if (relative === null) continue;
      const target = path.join(resourceDir(dataDir, id), ...relative.split('/'));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, data);
    }
    await store.mutate((draft) => {
      draft.actions = [...draft.actions, action];
    });
    actions.push(action);
  }
  return { actions, renamed, skipped };
}
