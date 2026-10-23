/**
 * dsh-action-hub — read-only built-in skills.
 *
 * Built-ins are standard skill directories shipped inside the plugin package:
 *
 *   builtin-actions/<folder>/SKILL.md
 *   builtin-actions/<folder>/...
 *
 * They are always Commands (zero model context) and never written to user data.
 *
 * @module dsh-action-hub/builtins
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readSkillDir } from './skill-doc.js';

const DEFAULT_ROOT = fileURLToPath(new URL('./builtin-actions/', import.meta.url));
const cache = new Map();

export function defaultBuiltinRoot() {
  return DEFAULT_ROOT;
}

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
    const skill = await readSkillDir(dir);
    if (skill.error !== '' || seen.has(skill.name)) continue;
    seen.add(skill.name);
    actions.push({
      id: skill.name,
      name: skill.name,
      skillName: skill.name,
      description: skill.description,
      prompt: skill.body,
      category: '内置',
      tags: [],
      argsHint: '',
      pinned: false,
      usage: { count: 0, lastAt: 0 },
      mode: 'command',
      scope: { mode: 'all', projects: [] },
      resources: skill.files.map((name) => ({ name, bytes: 0 })),
      frontmatter: skill.frontmatter,
      builtin: true,
      dir,
      fingerprint: skill.fingerprint,
    });
  }
  actions.sort((left, right) => left.name.localeCompare(right.name));
  cache.set(root, actions);
  return actions;
}

export function clearBuiltinCache() {
  cache.clear();
}
