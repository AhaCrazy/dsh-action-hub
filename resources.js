/**
 * dsh-action-hub — resources inside a standard skill directory.
 *
 * A skill directory is `SKILL.md` plus arbitrary sibling resources. This module
 * lists, previews, and serializes those resources for the model and for export.
 *
 * @module dsh-action-hub/resources
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { SKILL_FILE } from './skill-doc.js';

export const MAX_RESOURCE_FILE = 4 * 1024 * 1024;
export const MAX_RESOURCE_TOTAL = 32 * 1024 * 1024;
export const MAX_RESOURCE_COUNT = 64;
export const INLINE_FILE_LIMIT = 8 * 1024;
export const INLINE_TOTAL_LIMIT = 24 * 1024;
const PREVIEW_TEXT_LIMIT = 64 * 1024;

export function safeActionFolderName(actionId) {
  return String(actionId).replace(/[^a-zA-Z0-9._-]/gu, '-').replace(/^-+|-+$/gu, '') || 'skill';
}

export function actionDir(dataDir, actionId) {
  return path.join(dataDir, 'library', safeActionFolderName(actionId));
}

export function resourceDir(dataDir, actionId) {
  return actionDir(dataDir, actionId);
}

export function safeFileName(raw) {
  return safeActionFolderName(raw);
}

export function safeRelativeName(raw) {
  return String(raw).replace(/\\/gu, '/').split('/').filter((part) => part !== '' && part !== '.' && part !== '..').join('/');
}

export function resourcePath(dir, name) {
  return path.join(dir, ...safeRelativeName(name).split('/'));
}

/** List resource files (everything except SKILL.md and hidden files). */
export async function listResources(dir) {
  const out = [];
  async function walk(prefix) {
    let entries;
    try {
      entries = await fs.readdir(path.join(dir, prefix), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (prefix === '' && (entry.name === SKILL_FILE || entry.name.startsWith('.'))) continue;
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        await walk(relative);
      } else if (entry.isFile()) {
        const stat = await fs.stat(path.join(dir, relative)).catch(() => undefined);
        if (stat !== undefined) out.push({ name: relative, bytes: stat.size });
      }
    }
  }
  await walk('');
  return out.sort((left, right) => left.name.localeCompare(right.name));
}

export function normalizeResourceMeta(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry !== null && typeof entry === 'object' && typeof entry.name === 'string')
    .map((entry) => ({ name: safeRelativeName(entry.name), bytes: Number.isFinite(entry.bytes) ? entry.bytes : 0 }))
    .filter((entry) => entry.name !== '' && entry.name !== SKILL_FILE);
}

export async function readResourcePreviews(dir, meta) {
  const entries = Array.isArray(meta) && meta.length > 0 ? normalizeResourceMeta(meta) : await listResources(dir);
  const out = [];
  for (const entry of entries) {
    const stat = await fs.stat(resourcePath(dir, entry.name)).catch(() => undefined);
    if (stat === undefined) continue;
    const next = { name: entry.name, bytes: stat.size };
    if (stat.size <= PREVIEW_TEXT_LIMIT) {
      try {
        const buffer = await fs.readFile(resourcePath(dir, entry.name));
        if (!buffer.includes(0)) next.text = buffer.toString('utf8');
      } catch {
        /* metadata only */
      }
    }
    out.push(next);
  }
  return out;
}

export async function readInvocationResources(dataDir, action, dir = actionDir(dataDir, action.id)) {
  const entries = Array.isArray(action.resources) && action.resources.length > 0
    ? normalizeResourceMeta(action.resources)
    : await listResources(dir);
  const files = [];
  let inlineBudget = INLINE_TOTAL_LIMIT;
  for (const entry of entries) {
    const target = resourcePath(dir, entry.name);
    const stat = await fs.stat(target).catch(() => undefined);
    if (stat === undefined) continue;
    const next = { name: entry.name, bytes: stat.size, path: target };
    if (stat.size <= INLINE_FILE_LIMIT && stat.size <= inlineBudget) {
      try {
        const buffer = await fs.readFile(target);
        if (!buffer.includes(0)) {
          next.text = buffer.toString('utf8');
          inlineBudget -= buffer.length;
        }
      } catch {
        /* path only */
      }
    }
    files.push(next);
  }
  return { basePath: dir, files };
}

export async function exportResourceFiles(dir) {
  const entries = await listResources(dir);
  const out = [];
  for (const entry of entries) {
    try {
      out.push({ name: entry.name, text: (await fs.readFile(resourcePath(dir, entry.name))).toString('base64') });
    } catch {
      /* skip unreadable */
    }
  }
  return out;
}

export async function removeActionDir(dataDir, actionId) {
  await fs.rm(actionDir(dataDir, actionId), { recursive: true, force: true });
}

export async function removeResources(dir) {
  const entries = await listResources(dir);
  for (const entry of entries) await fs.rm(resourcePath(dir, entry.name), { force: true });
}

export async function writeResourceEntries() {
  throw new Error('v6 的标准 skill 目录不支持从编辑器写入资源；请直接编辑 SKILL.md 所在目录');
}
