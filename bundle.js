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
import { createHash } from 'node:crypto';
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
 * Build a ZIP buffer for selected Actions (or the whole library).
 *
 * @param {{ read: Function }} store
 * @param {string} dataDir
 * @param {string | readonly string[] | undefined} selection - one id, a list of
 *   ids, or undefined for every Action.
 * @returns {Promise<{ buffer: Buffer, count: number, filename: string }>}
 */
export async function exportZipBuffer(store, dataDir, selection = undefined) {
  const state = await store.read();
  const ids = selection === undefined
    ? null
    : typeof selection === 'string' ? [selection] : [...selection];
  const selected = ids === null
    ? state.actions
    : state.actions.filter((entry) => ids.includes(entry.id));
  if (selected.length === 0) throw new Error('没有可导出的 Action');
  const entries = [];
  for (const action of selected) {
    const dir = actionDir(dataDir, action.id);
    const folder = safeActionFolderName(action.id);
    for (const relative of await walkFiles(dir)) {
      entries.push({ name: `${folder}/${relative.replace(/\\/g, '/')}`, data: await fs.readFile(path.join(dir, relative)) });
    }
  }
  const filename = ids === null
    ? 'dsh-action-hub.zip'
    : ids.length === 1 ? `${safeActionFolderName(ids[0])}.zip` : 'dsh-action-hub-selection.zip';
  return {
    buffer: createZip(entries),
    count: selected.length,
    filename,
  };
}

/**
 * Import one or more Action directories from a folder.
 *
 * @param {{ read: Function }} store
 * @param {string} dataDir
 * @param {string} source
 * @returns {Promise<object>}
 */
export async function importFolder(store, dataDir, source) {
  const preview = await previewFolder(store, dataDir, source);
  const decisions = preview.items.map((item) => ({ key: item.key, mode: item.defaultMode, fingerprint: item.fingerprint }));
  return applyFolderPlan(store, dataDir, source, decisions);
}

/**
 * Import Action directories from a ZIP buffer.
 *
 * @param {{ read: Function, mutate: Function }} store
 * @param {string} dataDir
 * @param {Buffer} buffer
 * @returns {Promise<object>}
 */
export async function importZipBuffer(store, dataDir, buffer) {
  const preview = await previewZipBuffer(store, dataDir, buffer);
  const decisions = preview.items.map((item) => ({ key: item.key, mode: item.defaultMode, fingerprint: item.fingerprint }));
  return applyZipPlan(store, dataDir, buffer, decisions);
}

/**
 * Build the preview plan for a folder without changing the library.
 *
 * @param {{ read: Function }} store
 * @param {string} dataDir
 * @param {string} source
 * @returns {Promise<object>}
 */
export async function previewFolder(store, dataDir, source) {
  const root = path.resolve(String(source));
  const info = await fs.stat(root).catch(() => undefined);
  if (info === undefined || !info.isDirectory()) throw new Error('目录不存在');
  const candidates = await collectFolderCandidates(root);
  if (candidates.length === 0) throw new Error('目录里没有 action.json');
  return buildImportPlan(store, dataDir, candidates, root);
}

/**
 * Build the preview plan for a ZIP buffer without changing the library.
 *
 * @param {{ read: Function }} store
 * @param {string} dataDir
 * @param {Buffer} buffer
 * @returns {Promise<object>}
 */
export async function previewZipBuffer(store, dataDir, buffer) {
  const candidates = collectZipCandidates(buffer);
  if (candidates.length === 0) throw new Error('ZIP 里没有 Action 包');
  return buildImportPlan(store, dataDir, candidates, 'ZIP');
}

/**
 * Apply selected modes for a folder preview.
 *
 * @param {{ read: Function, mutate: Function }} store
 * @param {string} dataDir
 * @param {string} source
 * @param {Array<{ key: string, mode: string, fingerprint?: string }>} decisions
 * @returns {Promise<object>}
 */
export async function applyFolderPlan(store, dataDir, source, decisions) {
  const root = path.resolve(String(source));
  const info = await fs.stat(root).catch(() => undefined);
  if (info === undefined || !info.isDirectory()) throw new Error('目录不存在');
  const candidates = await collectFolderCandidates(root);
  if (candidates.length === 0) throw new Error('目录里没有 action.json');
  return applyImportPlan(store, dataDir, candidates, decisions, root);
}

/**
 * Apply selected modes for a ZIP preview.
 *
 * @param {{ read: Function, mutate: Function }} store
 * @param {string} dataDir
 * @param {Buffer} buffer
 * @param {Array<{ key: string, mode: string, fingerprint?: string }>} decisions
 * @returns {Promise<object>}
 */
export async function applyZipPlan(store, dataDir, buffer, decisions) {
  const candidates = collectZipCandidates(buffer);
  if (candidates.length === 0) throw new Error('ZIP 里没有 Action 包');
  return applyImportPlan(store, dataDir, candidates, decisions, 'ZIP');
}

// --------------------------------------------------------------- import core

function portablePayload(action) {
  return JSON.stringify({
    name: action.name ?? '',
    description: action.description ?? '',
    category: action.category ?? '',
    tags: Array.isArray(action.tags) ? [...action.tags].sort() : [],
    argsHint: action.argsHint ?? '',
    prompt: action.prompt ?? '',
  });
}

function actionFingerprint(action, files) {
  const hash = createHash('sha256');
  hash.update(portablePayload(action));
  for (const file of [...files].sort((left, right) => left.name.localeCompare(right.name))) {
    hash.update('\0');
    hash.update(file.name);
    hash.update('\0');
    hash.update(createHash('sha256').update(file.data).digest('hex'));
  }
  return `sha256:${hash.digest('hex')}`;
}

async function readFiles(root) {
  const files = [];
  for (const relative of await walkFiles(root)) {
    const safe = safeRelativeName(relative);
    if (safe === null) continue;
    files.push({
      name: safe,
      data: await fs.readFile(path.join(root, ...relative.split('/'))),
    });
  }
  return files.sort((left, right) => left.name.localeCompare(right.name));
}

async function readActionFiles(dataDir, id) {
  return readFiles(resourceDir(dataDir, id));
}

function withFileManifest(action, files) {
  return {
    ...action,
    resources: files.map((file) => ({ name: file.name, bytes: file.data.length })),
  };
}

function candidateFrom(action, files, key) {
  const normalized = normalizeAction(withFileManifest(action, files));
  return {
    key,
    raw: normalized,
    files,
    fingerprint: actionFingerprint(normalized, files),
  };
}

async function collectFolderCandidates(root) {
  const hasDocument = await fs.access(path.join(root, 'action.json')).then(() => true).catch(() => false);
  const dirs = hasDocument
    ? [root]
    : (await fs.readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name));
  const candidates = [];
  for (const dir of dirs) {
    const hasAction = await fs.access(path.join(dir, 'action.json')).then(() => true).catch(() => false);
    if (!hasAction) continue;
    let document;
    try {
      document = JSON.parse(await fs.readFile(path.join(dir, 'action.json'), 'utf8'));
    } catch {
      continue;
    }
    const raw = document !== null && typeof document === 'object' && document.action !== null && typeof document.action === 'object'
      ? document.action
      : document;
    let normalized;
    try {
      normalized = normalizeAction(raw);
    } catch {
      continue;
    }
    const files = await readFiles(path.join(dir, 'files'));
    candidates.push(candidateFrom(normalized, files, path.relative(root, dir) || '.'));
  }
  return candidates;
}

function collectZipCandidates(buffer) {
  const entries = readZip(buffer);
  const groups = new Map();
  for (const [name] of entries) {
    const normalized = name.replace(/\\/g, '/');
    const segments = normalized.split('/');
    if (segments.some((segment) => segment === '..' || segment === '')) continue;
    const documentAt = segments.lastIndexOf('action.json');
    if (documentAt < 0 || documentAt !== segments.length - 1) continue;
    const prefix = segments.slice(0, documentAt).join('/');
    if (groups.has(prefix)) continue;
    groups.set(prefix, { document: null, files: [] });
  }
  for (const [name, data] of entries) {
    const normalized = name.replace(/\\/g, '/');
    const segments = normalized.split('/');
    if (segments.some((segment) => segment === '..' || segment === '')) continue;
    const documentAt = segments.lastIndexOf('action.json');
    if (documentAt >= 0 && documentAt === segments.length - 1) {
      const prefix = segments.slice(0, documentAt).join('/');
      const group = groups.get(prefix);
      if (group !== undefined && group.document === null) {
        try {
          group.document = JSON.parse(data.toString('utf8'));
        } catch {
          group.document = null;
        }
      }
      continue;
    }
    const prefixes = [...groups.keys()].sort((left, right) => right.length - left.length);
    for (const prefix of prefixes) {
      const base = prefix === '' ? 'files/' : `${prefix}/files/`;
      if (!normalized.startsWith(base)) continue;
      const relative = safeRelativeName(normalized.slice(base.length));
      if (relative === null) break;
      groups.get(prefix).files.push({ name: relative, data });
      break;
    }
  }
  const candidates = [];
  for (const [prefix, group] of groups) {
    if (group.document === null) continue;
    const raw = group.document !== null && typeof group.document === 'object' && group.document.action !== null && typeof group.document.action === 'object'
      ? group.document.action
      : group.document;
    let normalized;
    try {
      normalized = normalizeAction(raw);
    } catch {
      continue;
    }
    const files = group.files.sort((left, right) => left.name.localeCompare(right.name));
    candidates.push(candidateFrom(normalized, files, prefix === '' ? 'root' : prefix));
  }
  return candidates;
}

async function existingCatalog(store, dataDir) {
  const state = await store.read();
  const rows = [];
  for (const action of state.actions) {
    const files = await readActionFiles(dataDir, action.id);
    rows.push({ action, files, fingerprint: actionFingerprint(action, files) });
  }
  return rows;
}

function itemModes(status) {
  if (status === 'new') return ['create', 'skip'];
  if (status === 'duplicate') return ['skip', 'create'];
  if (status === 'update') return ['update', 'skip', 'create'];
  return ['skip', 'update', 'create'];
}

async function buildImportPlan(store, dataDir, candidates, sourceLabel) {
  const existing = await existingCatalog(store, dataDir);
  const byId = new Map(existing.map((row) => [row.action.id, row]));
  const byFingerprint = new Map();
  for (const row of existing) {
    if (!byFingerprint.has(row.fingerprint)) byFingerprint.set(row.fingerprint, row);
  }
  const seenIncoming = new Map();
  const items = candidates.map((candidate) => {
    const target = byId.get(candidate.raw.id) ?? null;
    let duplicate = byFingerprint.get(candidate.fingerprint) ?? null;
    const incomingDuplicate = seenIncoming.get(candidate.fingerprint);
    if (incomingDuplicate !== undefined) duplicate = incomingDuplicate;
    let status;
    let defaultMode;
    if (incomingDuplicate !== undefined) {
      status = 'duplicate';
      defaultMode = 'skip';
    } else if (target !== null) {
      if (target.fingerprint === candidate.fingerprint) {
        status = 'duplicate';
        defaultMode = 'skip';
      } else if (target.action.source?.importedFingerprint === target.fingerprint) {
        status = 'update';
        defaultMode = 'update';
      } else {
        status = 'conflict';
        defaultMode = 'skip';
      }
    } else if (duplicate !== null) {
      status = 'duplicate';
      defaultMode = 'skip';
    } else {
      status = 'new';
      defaultMode = 'create';
    }
    seenIncoming.set(candidate.fingerprint, {
      id: target?.action.id ?? candidate.raw.id,
      name: target?.action.name ?? candidate.raw.name,
      key: candidate.key,
    });
    return {
      key: candidate.key,
      fingerprint: candidate.fingerprint,
      status,
      defaultMode,
      modes: itemModes(status),
      bundleId: candidate.raw.id,
      name: candidate.raw.name,
      description: candidate.raw.description,
      category: candidate.raw.category,
      tags: candidate.raw.tags,
      argsHint: candidate.raw.argsHint,
      promptPreview: candidate.raw.prompt.slice(0, 240),
      resources: candidate.raw.resources,
      target: target === null ? null : {
        id: target.action.id,
        name: target.action.name,
        fingerprint: target.fingerprint,
        modified: target.action.source?.importedFingerprint !== target.fingerprint,
      },
      duplicateOf: duplicate === null ? null : {
        id: duplicate.action?.id ?? duplicate.id,
        name: duplicate.action?.name ?? duplicate.name,
        key: duplicate.key,
      },
    };
  });
  const summary = { total: items.length, new: 0, duplicate: 0, update: 0, conflict: 0 };
  for (const item of items) summary[item.status] += 1;
  return { sourceLabel, items, summary };
}

function decisionMap(decisions) {
  const map = new Map();
  if (!Array.isArray(decisions)) return map;
  for (const entry of decisions) {
    if (entry === null || typeof entry !== 'object' || typeof entry.key !== 'string') continue;
    if (!['skip', 'create', 'update'].includes(entry.mode)) continue;
    map.set(entry.key, entry);
  }
  return map;
}

function importSource(candidate, sourceLabel) {
  return {
    kind: 'bundle',
    name: candidate.raw.name,
    detail: String(sourceLabel),
    importedFingerprint: candidate.fingerprint,
    importedAt: new Date().toISOString(),
  };
}

async function writeCandidateFiles(dataDir, id, files) {
  const target = resourceDir(dataDir, id);
  await fs.rm(target, { recursive: true, force: true });
  for (const file of files) {
    const filePath = path.join(target, ...file.name.split('/'));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.data);
  }
}

async function applyImportPlan(store, dataDir, candidates, decisions, sourceLabel) {
  const preview = await buildImportPlan(store, dataDir, candidates, sourceLabel);
  const chosen = decisionMap(decisions);
  const state = await store.read();
  const known = new Set(state.actions.map((action) => action.id));
  const byId = new Map(state.actions.map((action) => [action.id, action]));
  const actions = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let duplicated = 0;
  let conflicts = 0;
  let renamed = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const item = preview.items[index];
    if (item === undefined) continue;
    const decision = chosen.get(item.key);
    if (decision !== undefined && typeof decision.fingerprint === 'string' && decision.fingerprint !== item.fingerprint) {
      throw new Error('导入包内容已变化，请重新预览');
    }
    let mode = decision?.mode ?? item.defaultMode;
    if (!item.modes.includes(mode)) mode = 'skip';
    if (mode === 'skip') {
      skipped += 1;
      if (item.status === 'duplicate') duplicated += 1;
      if (item.status === 'conflict') conflicts += 1;
      continue;
    }
    if (mode === 'update') {
      const previous = byId.get(candidate.raw.id);
      if (previous === undefined) {
        skipped += 1;
        conflicts += 1;
        continue;
      }
      await writeCandidateFiles(dataDir, previous.id, candidate.files);
      const next = normalizeAction({
        ...candidate.raw,
        id: previous.id,
        createdAt: previous.createdAt,
        pinned: previous.pinned === true,
        usage: previous.usage,
        source: importSource(candidate, sourceLabel),
      });
      await store.mutate((draft) => {
        draft.actions = draft.actions.map((action) => (action.id === previous.id ? next : action));
      });
      byId.set(next.id, next);
      actions.push(next);
      updated += 1;
      continue;
    }
    let id = candidate.raw.id;
    if (known.has(id)) {
      id = uniqueId(known, candidate.raw);
      renamed += 1;
    }
    known.add(id);
    await writeCandidateFiles(dataDir, id, candidate.files);
    const next = normalizeAction({
      ...candidate.raw,
      id,
      source: importSource(candidate, sourceLabel),
    });
    await store.mutate((draft) => {
      draft.actions = [...draft.actions, next];
    });
    byId.set(next.id, next);
    actions.push(next);
    imported += 1;
  }

  return {
    actions,
    imported,
    updated,
    skipped,
    duplicated,
    conflicts,
    renamed,
  };
}

