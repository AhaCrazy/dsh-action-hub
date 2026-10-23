/**
 * dsh-action-hub — project resolution and local scope checks.
 *
 * A scope is always "all projects" or an explicit list of canonical project
 * roots. Unknown cwd (for example a default directory fallback) never matches a
 * project-limited entry; callers must fail closed.
 *
 * @module dsh-action-hub/host/scope
 */
import { promises as fs, realpathSync } from 'node:fs';
import path from 'node:path';

export function canonicalPath(value) {
  if (typeof value !== 'string' || value.trim() === '') return '';
  let resolved;
  try {
    resolved = realpathSync.native(value.trim());
  } catch {
    resolved = path.resolve(value.trim());
  }
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function samePath(left, right) {
  const a = canonicalPath(left);
  const b = canonicalPath(right);
  return a !== '' && a === b;
}

async function realpathOrSelf(value) {
  try {
    return await fs.realpath(value);
  } catch {
    return path.resolve(value);
  }
}

/**
 * Resolve the project root for a cwd. Only a real project root is accepted:
 * the cwd itself, a registered workspace, or the nearest `.git` ancestor.
 * A bare child directory without `.git` is unknown.
 */
export async function resolveProjectRoot(cwd) {
  if (typeof cwd !== 'string' || cwd.trim() === '') return null;
  const real = await realpathOrSelf(cwd.trim());
  const stat = await fs.stat(real).catch(() => undefined);
  if (stat === undefined || !stat.isDirectory()) return null;
  let current = real;
  for (;;) {
    if (await fs.stat(path.join(current, '.git')).then(() => true).catch(() => false)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return real;
}

/** Whether a scope permits a resolved project root. Unknown root never matches. */
export function scopeAllows(scope, root) {
  if (scope === null || typeof scope !== 'object' || scope.mode !== 'projects') return true;
  if (typeof root !== 'string' || root === '') return false;
  const projects = Array.isArray(scope.projects) ? scope.projects : [];
  return projects.some((entry) => entry !== null && typeof entry === 'object' && samePath(entry.path, root));
}

/** Build the compact scope payload the Web UI displays. */
export function describeScope(scope, currentRoot = null) {
  if (scope === null || typeof scope !== 'object' || scope.mode !== 'projects') {
    return { mode: 'all', projects: [], current: true };
  }
  const projects = Array.isArray(scope.projects) ? scope.projects : [];
  return {
    mode: 'projects',
    projects: projects.map((entry) => ({ label: entry.label, path: entry.path })),
    current: currentRoot !== null && scopeAllows(scope, currentRoot),
  };
}
