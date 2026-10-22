/**
 * dsh-action-hub — resource files for large Actions.
 *
 * An Action may carry code, templates, docs, or any other local files. They live
 * under `$DSH_HOME/action-hub/resources/<hashed-action-id>/`, are listed as
 * metadata on the Action, and are handed to the model as a resource manifest (or
 * inline text for small files) only when the user invokes that Action.
 *
 * @module dsh-action-hub/resources
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const MAX_RESOURCE_FILE = 4 * 1024 * 1024;
export const MAX_RESOURCE_TOTAL = 32 * 1024 * 1024;
export const MAX_RESOURCE_COUNT = 64;
const PREVIEW_TEXT_LIMIT = 64 * 1024;
const INLINE_FILE_LIMIT = 8 * 1024;
const INLINE_TOTAL_LIMIT = 24 * 1024;
const MAX_DEPTH = 4;
const ILLEGAL_SEGMENT = /[<>:"|?*\u0000-\u001f]/g;

/**
 * Stable per-Action folder name. Action ids may contain non-ASCII characters,
 * so only path-unsafe characters are replaced; the readable id is preserved for
 * backups and sharing.
 *
 * @param {string} actionId
 * @returns {string}
 */
export function safeActionFolderName(actionId) {
  const base = String(actionId ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/^\.+$/, 'action')
    .trim();
  return (base === '' ? 'action' : base).slice(0, 100);
}

/**
 * One self-contained Action directory: `actions/<id>/action.json` + `files/`.
 *
 * @param {string} dataDir
 * @param {string} actionId
 * @returns {string}
 */
export function actionDir(dataDir, actionId) {
  return path.join(dataDir, 'actions', safeActionFolderName(actionId));
}

/**
 * The resource directory for one Action.
 *
 * @param {string} dataDir
 * @param {string} actionId
 * @returns {string}
 */
export function resourceDir(dataDir, actionId) {
  return path.join(actionDir(dataDir, actionId), 'files');
}

/**
 * Legacy (pre-4.0) resource directory: `resources/<sha1(id)>/`.
 *
 * @param {string} dataDir
 * @param {string} actionId
 * @returns {string}
 */
export function legacyResourceDir(dataDir, actionId) {
  const digest = createHash('sha1').update(String(actionId)).digest('hex').slice(0, 24);
  return path.join(dataDir, 'resources', digest);
}

/**
 * Remove one Action's whole directory (document and files).
 *
 * @param {string} dataDir
 * @param {string} actionId
 * @returns {Promise<void>}
 */
export async function removeActionDir(dataDir, actionId) {
  await fs.rm(actionDir(dataDir, actionId), { recursive: true, force: true });
}

/**
 * Sanitize one browser file name into a safe flat name.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
export function safeFileName(raw) {
  if (typeof raw !== 'string') return null;
  const base = path.basename(raw.replace(/\\/g, '/')).replace(ILLEGAL_SEGMENT, '_').trim();
  if (base === '' || base === '.' || base === '..') return null;
  return base.slice(0, 120);
}

/**
 * Sanitize a relative resource path (nested paths come from imported Skills).
 *
 * @param {unknown} raw
 * @returns {string | null} posix-style relative path, or null when unsafe.
 */
export function safeRelativeName(raw) {
  if (typeof raw !== 'string') return null;
  const segments = raw.replace(/\\/g, '/').split('/').filter((segment) => segment !== '');
  if (segments.length === 0 || segments.length > MAX_DEPTH) return null;
  const clean = [];
  for (const segment of segments) {
    if (segment === '.' || segment === '..') return null;
    const next = segment.replace(ILLEGAL_SEGMENT, '_').trim().slice(0, 80);
    if (next === '') return null;
    clean.push(next);
  }
  return clean.join('/');
}

/**
 * Resolve one safe relative name inside a resource directory.
 *
 * @param {string} dir
 * @param {string} name - already sanitized.
 * @returns {string}
 */
export function resourcePath(dir, name) {
  return path.join(dir, ...name.split('/'));
}

/**
 * Normalize resource metadata for storage/display.
 *
 * @param {unknown} value
 * @returns {Array<{ name: string, bytes: number }>}
 */
export function normalizeResourceMeta(value) {
  const out = [];
  const seen = new Set();
  if (!Array.isArray(value)) return out;
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') continue;
    const name = safeRelativeName(entry.name);
    if (name === null || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, bytes: Number.isFinite(entry.bytes) ? Math.max(0, Math.floor(entry.bytes)) : 0 });
    if (out.length >= MAX_RESOURCE_COUNT) break;
  }
  return out;
}

async function walk(dir, prefix = '', out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      await walk(path.join(dir, entry.name), relative, out);
      continue;
    }
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    out.push(relative);
  }
  return out;
}

/**
 * List every regular resource file as normalized metadata.
 *
 * @param {string} dir
 * @returns {Promise<Array<{ name: string, bytes: number }>>}
 */
export async function listResources(dir) {
  const names = await walk(dir);
  const out = [];
  for (const name of names.slice(0, MAX_RESOURCE_COUNT * 4)) {
    try {
      const stat = await fs.stat(resourcePath(dir, name));
      if (!stat.isFile()) continue;
      out.push({ name, bytes: stat.size });
    } catch {
      /* a vanished entry is simply omitted */
    }
    if (out.length >= MAX_RESOURCE_COUNT) break;
  }
  return out;
}

/**
 * Replace the resource directory with an explicit set of entries.
 *
 * @param {string} dir
 * @param {Array<{ name?: string, contentBase64?: string }>} entries
 * @returns {Promise<Array<{ name: string, bytes: number }>>}
 */
export async function writeResourceEntries(dir, entries) {
  await removeResources(dir);
  const written = [];
  let total = 0;
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (written.length >= MAX_RESOURCE_COUNT) break;
    const name = safeRelativeName(entry?.name);
    if (name === null || typeof entry?.contentBase64 !== 'string') continue;
    let buffer;
    try {
      buffer = Buffer.from(entry.contentBase64, 'base64');
    } catch {
      continue;
    }
    if (buffer.length > MAX_RESOURCE_FILE || total + buffer.length > MAX_RESOURCE_TOTAL) continue;
    const target = resourcePath(dir, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    total += buffer.length;
    written.push({ name, bytes: buffer.length });
  }
  return written;
}

/**
 * Write one file without disturbing the others, enforcing the aggregate caps.
 *
 * @param {string} dir
 * @param {string} rawName
 * @param {Buffer} buffer
 * @param {readonly Array<{ name: string, bytes: number }>} existing
 * @returns {Promise<Array<{ name: string, bytes: number }>>} the updated metadata.
 */
export async function addResourceFile(dir, rawName, buffer, existing) {
  const name = safeRelativeName(rawName);
  if (name === null) throw new Error('无效的文件名');
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('文件是空的');
  if (buffer.length > MAX_RESOURCE_FILE) throw new Error('单个资源文件不能超过 4 MB');
  const meta = normalizeResourceMeta(existing);
  const previous = meta.find((entry) => entry.name === name);
  const total = meta.reduce((sum, entry) => sum + entry.bytes, 0) - (previous?.bytes ?? 0);
  if (total + buffer.length > MAX_RESOURCE_TOTAL) throw new Error('资源目录不能超过 32 MB');
  if (previous === undefined && meta.length >= MAX_RESOURCE_COUNT) throw new Error('每个 Action 最多 64 个资源文件');
  const target = resourcePath(dir, name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  const next = meta.filter((entry) => entry.name !== name);
  next.push({ name, bytes: buffer.length });
  next.sort((left, right) => left.name.localeCompare(right.name));
  return next;
}

/**
 * Delete one resource file and return the updated metadata.
 *
 * @param {string} dir
 * @param {unknown} rawName
 * @param {readonly Array<{ name: string, bytes: number }>} existing
 * @returns {Promise<Array<{ name: string, bytes: number }>>}
 */
export async function deleteResourceFile(dir, rawName, existing) {
  const name = safeRelativeName(rawName);
  if (name === null) throw new Error('无效的文件名');
  try {
    await fs.unlink(resourcePath(dir, name));
  } catch {
    /* absence is the postcondition */
  }
  return normalizeResourceMeta(existing).filter((entry) => entry.name !== name);
}

/**
 * Remove one Action's whole resource directory.
 *
 * @param {string} dir
 * @returns {Promise<void>}
 */
export async function removeResources(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Read every resource for export, with base64 content.
 *
 * @param {string} dir
 * @param {readonly Array<{ name: string, bytes: number }>} meta
 * @returns {Promise<Array<{ name: string, bytes: number, contentBase64: string }>>}
 */
export async function exportResourceFiles(dir, meta) {
  const out = [];
  for (const entry of normalizeResourceMeta(meta)) {
    try {
      const buffer = await fs.readFile(resourcePath(dir, entry.name));
      out.push({ name: entry.name, bytes: buffer.length, contentBase64: buffer.toString('base64') });
    } catch {
      /* missing files are omitted from the export */
    }
  }
  return out;
}

/**
 * Editor previews: metadata plus decoded text for reasonably small text files.
 *
 * @param {string} dir
 * @param {readonly Array<{ name: string, bytes: number }>} meta
 * @returns {Promise<Array<{ name: string, bytes: number, text?: string }>>}
 */
export async function readResourcePreviews(dir, meta) {
  const out = [];
  for (const entry of normalizeResourceMeta(meta)) {
    const next = { name: entry.name, bytes: entry.bytes };
    if (entry.bytes <= PREVIEW_TEXT_LIMIT) {
      try {
        const buffer = await fs.readFile(resourcePath(dir, entry.name));
        if (!buffer.includes(0)) next.text = buffer.toString('utf8');
      } catch {
        /* keep metadata only */
      }
    }
    out.push(next);
  }
  return out;
}

/**
 * Build the model-facing resource context for one invocation: small text files
 * are inlined, everything else keeps a readable local path for on-demand reads.
 *
 * @param {string} dataDir
 * @param {{ id: string, resources?: Array<{ name: string, bytes: number }> }} action
 * @returns {Promise<{ basePath: string, files: Array<{ name: string, bytes: number, text?: string, path: string }> }>}
 */
export async function readInvocationResources(dataDir, action) {
  const dir = resourceDir(dataDir, action.id);
  const files = [];
  let inlineBudget = INLINE_TOTAL_LIMIT;
  for (const entry of normalizeResourceMeta(action.resources)) {
    const target = resourcePath(dir, entry.name);
    const next = { name: entry.name, bytes: entry.bytes, path: target };
    if (entry.bytes <= INLINE_FILE_LIMIT && entry.bytes <= inlineBudget) {
      try {
        const buffer = await fs.readFile(target);
        if (!buffer.includes(0)) {
          next.text = buffer.toString('utf8');
          inlineBudget -= buffer.length;
        }
      } catch {
        /* path-only entry */
      }
    }
    files.push(next);
  }
  return { basePath: dir, files };
}

