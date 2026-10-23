/**
 * dsh-action-hub — known project roots for the scope picker.
 *
 * Only DSH-registered workspaces are offered; the user never hand-types a path.
 *
 * @module dsh-action-hub/host/projects
 */
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
