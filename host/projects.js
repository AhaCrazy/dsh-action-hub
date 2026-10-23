/**
 * dsh-action-hub — known project roots for the scope picker.
 *
 * Only DSH-registered workspaces are offered; the user never hand-types a path.
 *
 * @module dsh-action-hub/host/projects
 */
import { canonicalPath, resolveProjectRoot } from './scope.js';

export async function listProjects(ctx) {
  const registry = ctx.get?.('workspaceRegistry');
  if (registry === undefined || typeof registry.list !== 'function') return [];
  let items = [];
  try {
    items = await registry.list();
  } catch {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    if (item === null || typeof item !== 'object') continue;
    const raw = typeof item.path === 'string' ? item.path : typeof item.realPath === 'string' ? item.realPath : '';
    if (raw === '') continue;
    const key = process.platform === 'win32' ? raw.toLowerCase() : raw;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: typeof item.title === 'string' && item.title !== '' ? item.title : raw.split(/[\\/]/u).pop() || raw,
      path: raw,
    });
  }
  return out.sort((left, right) => left.label.localeCompare(right.label));
}

/** Choose the requested session's project, or fall back to the most recent session cwd. */
export async function findCurrentProject(ctx, projects = [], preferredSessionId = '') {
  if (!Array.isArray(projects) || projects.length === 0) return null;
  const sessions = ctx.get?.('sessions');
  if (sessions === undefined || typeof sessions.list !== 'function') return null;
  let list;
  try {
    list = sessions.list();
    if (list !== null && typeof list?.then === 'function') list = await list;
  } catch {
    return null;
  }
  const roots = new Set(projects.map((project) => canonicalPath(project.path)));
  const all = Array.isArray(list) ? list : [];
  const ordered = [...all].sort((left, right) => {
    const a = Number(left?.header?.updatedAt ?? left?.updatedAt ?? left?.header?.createdAt ?? 0) || 0;
    const b = Number(right?.header?.updatedAt ?? right?.updatedAt ?? right?.header?.createdAt ?? 0) || 0;
    return b - a;
  });
  const resolveSession = async (session) => {
    const cwd = session?.header?.cwd ?? session?.cwd ?? session?.workspace?.path;
    if (typeof cwd !== 'string' || cwd === '') return null;
    let root;
    try {
      root = await resolveProjectRoot(cwd, projects);
    } catch {
      return null;
    }
    const key = root === null ? '' : canonicalPath(root);
    return key !== '' && roots.has(key) ? projects.find((project) => canonicalPath(project.path) === key) ?? null : null;
  };
  if (typeof preferredSessionId === 'string' && preferredSessionId !== '') {
    const preferred = all.find((session) => {
      const id = session?.header?.id ?? session?.header?.sessionId ?? session?.id ?? session?.sessionId;
      return id === preferredSessionId;
    });
    if (preferred !== undefined) return resolveSession(preferred);
  }
  for (const session of ordered) {
    const project = await resolveSession(session);
    if (project !== null) return project;
  }
  return null;
}
