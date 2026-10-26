/**
 * dsh-action-hub — project-centric Action availability.
 *
 * A project selects groups and can add individual Actions. An Action is
 * available when one of its groups is selected, or when it is explicitly
 * listed. A project without a stored profile defaults to the configured new
 * workspace group (none until the user creates and selects one).
 *
 * @module dsh-action-hub/host/availability
 */
import { defaultProjectProfile } from '../store.js';
import { canonicalPath } from './scope.js';

export function findProjectProfile(projects, projectRoot) {
  if (!Array.isArray(projects) || typeof projectRoot !== 'string' || projectRoot === '') return null;
  const key = canonicalPath(projectRoot);
  if (key === '') return null;
  return projects.find((project) => canonicalPath(project.path) === key) ?? null;
}

export function profileFor(projects, projectRoot, defaultGroup = '') {
  return findProjectProfile(projects, projectRoot)
    ?? defaultProjectProfile(typeof projectRoot === 'string' ? projectRoot : '', '', defaultGroup);
}

export function expandGroupIds(groups, selectedIds) {
  const selected = Array.isArray(selectedIds) ? selectedIds : [];
  const byId = new Map((Array.isArray(groups) ? groups : []).map((group) => [group.id, group]));
  const seen = new Set();
  const visit = (id) => {
    if (typeof id !== 'string' || id === '' || seen.has(id)) return;
    seen.add(id);
    const group = byId.get(id);
    for (const child of group?.includes ?? []) visit(child);
  };
  for (const id of selected) visit(id);
  return seen;
}

export function selectedGroupIds(profile, groups = []) {
  const selected = new Set(Array.isArray(profile?.groups) ? profile.groups : []);
  for (const group of Array.isArray(groups) ? groups : []) {
    if (group !== null && group.global === true && typeof group.id === 'string') selected.add(group.id);
  }
  return expandGroupIds(groups, [...selected]);
}

export function actionAvailable(action, profile, groups = []) {
  if (action === null || typeof action !== 'object') return false;
  if (action.builtin === true) return true;
  const selected = selectedGroupIds(profile, groups);
  if (Array.isArray(profile?.actions) && profile.actions.includes(action.name)) return true;
  return Array.isArray(action.groups) && action.groups.some((id) => selected.has(id));
}

export function availableActions(actions, profile, groups = []) {
  return actions.filter((action) => actionAvailable(action, profile, groups));
}
