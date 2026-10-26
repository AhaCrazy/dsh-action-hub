/**
 * dsh-action-hub — standard-skill library and local state.
 *
 * A skill is the portable directory `<dataDir>/library/<name>/SKILL.md` plus
 * sibling resources. Everything that is *not* portable (mode, scope, category,
 * pin, usage, argument hint) lives in `<dataDir>/state.json`, keyed by the
 * standard skill name. No `action.json` exists in v6.
 *
 * @module dsh-action-hub/store
 */
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  MAX_BODY,
  MAX_DESCRIPTION,
  readSkillDir,
  writeSkillDir,
  assertSkillName,
  describeError,
} from './skill-doc.js';
import { listResources } from './resources.js';

export const STORE_VERSION = 4;
export const STATE_FORMAT = 'dsh-action-hub/state@2';
export const COMMON_GROUP_ID = 'common';
export const UNGROUPED_GROUP_ID = 'ungrouped';
export const STATE_FILE = 'state.json';
export const LIBRARY_DIR = 'library';
export const MAX_PROMPT = MAX_BODY;
export const ARG_TOKENS = ['{{args}}', '{{ARGS}}', '$ARGUMENTS', '{{input}}'];

/** Default data directory under DSH_HOME. */
export function defaultDataDir() {
  const home = process.env.DSH_HOME?.trim();
  return path.join(home !== undefined && home !== '' ? home : path.join(os.homedir(), '.dsh'), 'dsh-action-hub');
}

export function defaultScope() {
  return { mode: 'all', projects: [] };
}

export function currentUsagePeriods(now = new Date()) {
  const week = weekKey(now);
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return { week, month };
}

function weekKey(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((copy - yearStart) / 86_400_000) + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function bumpUsage(previous, now = Date.now()) {
  const current = previous !== null && typeof previous === 'object' ? previous : {};
  const periods = currentUsagePeriods(new Date(now));
  const priorWeek = current.week !== null && typeof current.week === 'object' ? current.week : {};
  const priorMonth = current.month !== null && typeof current.month === 'object' ? current.month : {};
  return {
    count: Number.isFinite(current.count) ? current.count + 1 : 1,
    lastAt: now,
    week: {
      key: periods.week,
      count: Number.isFinite(priorWeek.count) && priorWeek.key === periods.week ? priorWeek.count + 1 : 1,
    },
    month: {
      key: periods.month,
      count: Number.isFinite(priorMonth.count) && priorMonth.key === periods.month ? priorMonth.count + 1 : 1,
    },
  };
}

export function expandPrompt(prompt, context = {}) {
  const source = typeof prompt === 'string' ? prompt : '';
  const args = typeof context.args === 'string' ? context.args.trim() : '';
  const now = context.date instanceof Date ? context.date : new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const hasSlot = ARG_TOKENS.some((token) => source.includes(token));
  let expanded = source;
  for (const token of ARG_TOKENS) expanded = expanded.split(token).join(args);
  expanded = expanded.split('{{date}}').join(date).split('{{DATE}}').join(date);
  if (args !== '' && !hasSlot) expanded = `${expanded}\n\n${args}`;
  return expanded.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trimEnd();
}

export function normalizeScope(scope) {
  if (scope === null || typeof scope !== 'object') return defaultScope();
  const mode = scope.mode === 'projects' ? 'projects' : 'all';
  if (mode === 'all') return defaultScope();
  const projects = [];
  const seen = new Set();
  for (const entry of Array.isArray(scope.projects) ? scope.projects : []) {
    if (entry === null || typeof entry !== 'object' || typeof entry.path !== 'string') continue;
    const raw = entry.path.trim();
    if (raw === '') continue;
    const key = process.platform === 'win32' ? raw.toLowerCase() : raw;
    if (seen.has(key)) continue;
    seen.add(key);
    projects.push({
      label: typeof entry.label === 'string' && entry.label.trim() !== '' ? entry.label.trim() : path.basename(raw) || raw,
      path: raw.replace(/[\\/]+$/u, '') || raw,
    });
  }
  return { mode, projects };
}

export const DEFAULT_GROUP_ID = 'common';
export const DEFAULT_BUILTIN_ID = 'skill-import-assistant';

export function defaultGroups() {
  return [{
    id: DEFAULT_GROUP_ID,
    name: 'Common',
    builtin: false,
    global: true,
    includes: [],
  }];
}

export function normalizeGroupName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 40) : '';
}

function normalizeGroupIds(value) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(value) ? value : []) {
    if (typeof item !== 'string') continue;
    const id = item.trim().toLowerCase();
    if (id === '' || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function normalizeGroups(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (item === null || typeof item !== 'object') continue;
    const name = normalizeGroupName(item.name);
    const id = typeof item.id === 'string' ? item.id.trim().toLowerCase() : '';
    if (name === '' || id === '' || id === UNGROUPED_GROUP_ID || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name,
      builtin: false,
      global: item.global === true,
      includes: normalizeGroupIds(item.includes),
    });
  }
  const ids = new Set(out.map((group) => group.id));
  for (const group of out) {
    // Cycles are allowed: they describe one shared pool of Actions. Every
    // traversal uses a visited set, so the graph never recurses forever.
    group.includes = group.includes.filter((child) => child !== group.id && ids.has(child));
  }
  return out;
}

export function defaultProjectProfile(path = '', label = '', groupId = '') {
  return {
    path,
    label,
    groups: groupId === '' ? [] : [groupId],
    actions: [],
    excludeGroups: [],
    excludeActions: [],
  };
}

export function normalizeProjectProfiles(raw, groups = defaultGroups()) {
  const validGroups = new Set(groups.map((group) => group.id));
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (item === null || typeof item !== 'object' || typeof item.path !== 'string') continue;
    const projectPath = item.path.trim().replace(/[\\/]+$/u, '');
    if (projectPath === '') continue;
    const key = process.platform === 'win32' ? projectPath.toLowerCase() : projectPath;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      path: projectPath,
      label: typeof item.label === 'string' && item.label.trim() !== '' ? item.label.trim() : path.basename(projectPath) || projectPath,
      groups: normalizeGroupIds(item.groups).filter((id) => validGroups.has(id)),
      actions: [...new Set((Array.isArray(item.actions) ? item.actions : []).filter((name) => typeof name === 'string' && name.trim() !== '').map((name) => name.trim()))],
      excludeGroups: normalizeGroupIds(item.excludeGroups).filter((id) => validGroups.has(id)),
      excludeActions: [...new Set((Array.isArray(item.excludeActions) ? item.excludeActions : []).filter((name) => typeof name === 'string' && name.trim() !== '').map((name) => name.trim()))],
    });
  }
  return out;
}

export function normalizeMode(mode) {
  return mode === 'skill' ? 'skill' : 'command';
}

export function normalizeAction(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  return {
    name,
    description: typeof input.description === 'string' ? input.description.trim().slice(0, MAX_DESCRIPTION) : '',
    prompt: typeof input.prompt === 'string' ? input.prompt : '',
    category: typeof input.category === 'string' ? input.category.trim().slice(0, 40) : '',
    tags: Array.isArray(input.tags) ? input.tags.filter((tag) => typeof tag === 'string' && tag.trim() !== '').map((tag) => tag.trim()) : [],
    argsHint: typeof input.argsHint === 'string' ? input.argsHint.trim().slice(0, 120) : '',
    pinned: input.pinned === true,
    mode: normalizeMode(input.mode),
    groups: Array.isArray(input.groups) ? normalizeGroupIds(input.groups) : [],
  };
}

export function validateAction(action) {
  if (!isValidName(action.name)) return { ok: false, code: 'name', message: '技能名必须是 kebab-case（小写字母、数字、连字符）' };
  if (action.description === '') return { ok: false, code: 'description', message: '描述不能为空' };
  if (action.prompt.trim() === '') return { ok: false, code: 'prompt', message: '正文不能为空' };
  if (action.prompt.length > MAX_PROMPT) return { ok: false, code: 'prompt', message: `正文不能超过 ${MAX_PROMPT} 字符` };
  return { ok: true };
}

function isValidName(value) {
  try {
    assertSkillName(value);
    return true;
  } catch {
    return false;
  }
}

export function sortActions(actions) {
  return [...actions].sort((left, right) => {
    if (left.builtin !== right.builtin) return left.builtin ? 1 : -1;
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    return left.name.localeCompare(right.name, 'zh-Hans-CN');
  });
}

export function mergeActions(...groups) {
  const map = new Map();
  for (const group of groups) {
    for (const action of Array.isArray(group) ? group : []) map.set(action.id, action);
  }
  return [...map.values()];
}

function statePath(dataDir) {
  return path.join(dataDir, STATE_FILE);
}

function libraryPath(dataDir, name) {
  return path.join(dataDir, LIBRARY_DIR, name);
}

function emptyState() {
  return {
    format: STATE_FORMAT,
    groups: defaultGroups(),
    entries: {
      [DEFAULT_BUILTIN_ID]: {
        ...defaultEntry(),
        groups: [DEFAULT_GROUP_ID],
      },
    },
    projects: [],
    defaultGroup: '',
  };
}

function normalizeEntryRecord(raw, projectsByName) {
  if (raw === null || typeof raw !== 'object') return { entry: undefined, legacyProjects: [] };
  const { scope, ...rest } = raw;
  let groups;
  if (Array.isArray(rest.groups)) {
    groups = normalizeGroupIds(rest.groups);
  } else if (scope?.mode === 'projects') {
    groups = [];
  } else {
    groups = [];
  }
  const legacyProjects = scope?.mode === 'projects' && Array.isArray(scope.projects)
    ? scope.projects.filter((entry) => entry !== null && typeof entry === 'object' && typeof entry.path === 'string')
    : [];
  return { entry: { ...rest, groups }, legacyProjects };
}

function normalizeState(parsed) {
  const groups = normalizeGroups(parsed.groups);
  const entries = {};
  const migrated = new Map();
  const sourceEntries = parsed.entries !== null && typeof parsed.entries === 'object' ? parsed.entries : {};
  for (const [name, raw] of Object.entries(sourceEntries)) {
    const { entry, legacyProjects } = normalizeEntryRecord(raw);
    if (entry === undefined) continue;
    entries[name] = entry;
    for (const project of legacyProjects) {
      const key = process.platform === 'win32' ? project.path.toLowerCase() : project.path;
      if (!migrated.has(key)) migrated.set(key, { path: project.path, label: project.label, groups: [], actions: [] });
      migrated.get(key).actions.push(name);
    }
  }
  const profiles = normalizeProjectProfiles(
    Array.isArray(parsed.projects) ? parsed.projects : [...migrated.values()],
    groups,
  );
  const validIds = new Set(groups.map((group) => group.id));
  for (const entry of Object.values(entries)) {
    entry.groups = normalizeGroupIds(entry.groups).filter((id) => validIds.has(id));
  }
  const validGroupIds = new Set(groups.map((group) => group.id));
  const requestedDefault = typeof parsed.defaultGroup === 'string' ? parsed.defaultGroup.trim().toLowerCase() : '';
  const defaultGroup = validGroupIds.has(requestedDefault) ? requestedDefault : '';
  const rawGroups = Array.isArray(parsed.groups) ? parsed.groups : [];
  const rawProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const hadLegacyUngrouped = rawGroups.some((group) => group?.id === UNGROUPED_GROUP_ID)
    || Object.values(sourceEntries).some((entry) => Array.isArray(entry?.groups) && entry.groups.includes(UNGROUPED_GROUP_ID))
    || rawProjects.some((project) => Array.isArray(project?.groups) && project.groups.includes(UNGROUPED_GROUP_ID));
  const changed = parsed.format !== STATE_FORMAT
    || !Array.isArray(parsed.groups)
    || !Array.isArray(parsed.projects)
    || parsed.defaultGroup !== defaultGroup
    || hadLegacyUngrouped
    || Object.values(sourceEntries).some((entry) => entry !== null && typeof entry === 'object' && 'scope' in entry);
  return { state: { format: STATE_FORMAT, groups, entries, projects: profiles, defaultGroup }, changed };
}

async function readStateFile(dataDir) {
  try {
    const raw = await fs.readFile(statePath(dataDir), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return { state: emptyState(), changed: false };
    return normalizeState(parsed);
  } catch {
    return { state: emptyState(), changed: false };
  }
}

async function writeStateFile(dataDir, state) {
  await fs.mkdir(dataDir, { recursive: true });
  const target = statePath(dataDir);
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, target);
}

async function ensureDataDir(dataDir) {
  await fs.mkdir(path.join(dataDir, LIBRARY_DIR), { recursive: true });
  // v6 is a clean break. Keep test-era v5 data in a backup instead of deleting it.
  const legacy = path.join(dataDir, 'actions');
  const marker = path.join(dataDir, '.layout-v6');
  const exists = await fs.stat(legacy).catch(() => undefined);
  if (exists?.isDirectory() && !(await fs.stat(marker).catch(() => undefined))) {
    const stamp = new Date().toISOString().replace(/[:.]/gu, '-');
    const backup = path.join(dataDir, `backup-v5-test-${stamp}`);
    try {
      await fs.rename(legacy, backup);
    } catch {
      /* a locked legacy directory must not stop the empty v6 library */
    }
  }
  await fs.writeFile(marker, 'dsh-action-hub/v6\n', 'utf8').catch(() => {});
}

function defaultEntry() {
  return {
    mode: 'command',
    category: '',
    tags: [],
    argsHint: '',
    pinned: false,
    usage: { count: 0, lastAt: 0 },
    groups: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

function mergeEntry(state, name) {
  const raw = state.entries[name];
  const entry = { ...defaultEntry(), ...(raw !== null && typeof raw === 'object' ? raw : {}) };
  entry.mode = normalizeMode(entry.mode);
  entry.groups = normalizeGroupIds(entry.groups);
  entry.tags = Array.isArray(entry.tags) ? entry.tags.filter((tag) => typeof tag === 'string') : [];
  entry.pinned = entry.pinned === true;
  entry.usage = entry.usage !== null && typeof entry.usage === 'object' ? entry.usage : { count: 0, lastAt: 0 };
  return entry;
}

function toAction(skill, entry, resources = []) {
  return {
    id: skill.name,
    name: skill.name,
    skillName: skill.name,
    description: skill.description,
    prompt: skill.body,
    category: entry.category,
    tags: entry.tags,
    argsHint: entry.argsHint,
    pinned: entry.pinned,
    usage: entry.usage,
    mode: entry.mode,
    groups: entry.groups,
    resources,
    frontmatter: skill.frontmatter,
    builtin: false,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    dir: skill.dir,
    fingerprint: skill.fingerprint,
  };
}

export function createStore(options = {}) {
  const dataDir = typeof options.dataDir === 'string' && options.dataDir.trim() !== '' ? options.dataDir.trim() : defaultDataDir();
  let queue = Promise.resolve();

  const serialize = (task) => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };

  async function readState() {
    await ensureDataDir(dataDir);
    const { state, changed } = await readStateFile(dataDir);
    if (changed) await writeStateFile(dataDir, state);
    return state;
  }

  async function readLibrary() {
    await ensureDataDir(dataDir);
    let entries;
    try {
      entries = await fs.readdir(path.join(dataDir, LIBRARY_DIR), { withFileTypes: true });
    } catch {
      return { skills: [], invalid: [] };
    }
    const skills = [];
    const invalid = [];
    for (const dirent of entries) {
      if (!dirent.isDirectory() || dirent.name.startsWith('.')) continue;
      const skill = await readSkillDir(path.join(dataDir, LIBRARY_DIR, dirent.name));
      if (skill.error !== '') {
        if (skill.error !== '缺少 SKILL.md') invalid.push({ dir: skill.dir, name: skill.name, error: skill.error });
        continue;
      }
      if (skill.name !== dirent.name) {
        invalid.push({ dir: skill.dir, name: skill.name, error: `目录名与 SKILL.md name 不一致（${skill.name}）` });
        continue;
      }
      skills.push(skill);
    }
    return { skills, invalid };
  }

  async function mergeSkills(keepNames = [], prune = false) {
    const state = await readState();
    const { skills, invalid } = await readLibrary();
    const actions = [];
    for (const skill of skills) actions.push(toAction(skill, mergeEntry(state, skill.name), await listResources(skill.dir)));
    // Reconcile state with the actual library: a skill deleted outside the
    // plugin must not leave a permanent orphan entry behind. Keep entries that
    // the caller owns (built-ins) and entries whose directory still exists but
    // is temporarily invalid, so a malformed SKILL.md can be repaired.
    const keep = new Set([
      ...keepNames,
      ...skills.map((skill) => skill.name),
      ...invalid.map((entry) => entry.name).filter((name) => typeof name === 'string' && name !== ''),
    ]);
    let dirty = false;
    if (prune) {
      for (const name of Object.keys(state.entries)) {
        if (keep.has(name)) continue;
        delete state.entries[name];
        dirty = true;
      }
    }
    if (dirty) await writeStateFile(dataDir, state);
    return { state, actions, invalid };
  }

  return {
    dataDir,
    filePath: () => statePath(dataDir),
    libraryDir: () => path.join(dataDir, LIBRARY_DIR),
    async read(options = {}) {
      const keep = Array.isArray(options?.keep) ? options.keep : [];
      const { state, actions, invalid } = await mergeSkills(keep, options?.prune === true);
      return { version: STORE_VERSION, actions, state, invalid };
    },
    async readState() {
      return readState();
    },
    async readLibrary() {
      return readLibrary();
    },
    async create(input) {
      return serialize(async () => {
        const action = normalizeAction(input);
        const valid = validateAction(action);
        if (!valid.ok) throw new Error(valid.message);
        await ensureDataDir(dataDir);
        const dir = libraryPath(dataDir, action.name);
        if (await fs.stat(dir).catch(() => undefined)) throw new Error(`技能已存在：${action.name}`);
        await writeSkillDir(dir, { name: action.name, description: action.description, body: action.prompt, frontmatter: {} });
        const state = await readState();
        const now = Date.now();
        state.entries[action.name] = {
          ...defaultEntry(),
          mode: action.mode,
          category: action.category,
          tags: action.tags,
          argsHint: action.argsHint,
          pinned: action.pinned,
          groups: action.groups,
          createdAt: now,
          updatedAt: now,
        };
        await writeStateFile(dataDir, state);
        return (await mergeSkills()).actions.find((entry) => entry.id === action.name);
      });
    },
    async update(id, patch) {
      return serialize(async () => {
        const name = assertSkillName(id);
        const state = await readState();
        const { skills } = await readLibrary();
        const existing = skills.find((skill) => skill.name === name);
        if (existing === undefined) throw new Error('技能不存在');
        const next = normalizeAction({
          ...toAction(existing, mergeEntry(state, name)),
          ...(patch !== null && typeof patch === 'object' ? patch : {}),
        });
        const valid = validateAction(next);
        if (!valid.ok) throw new Error(valid.message);
        if (next.name !== name) {
          const target = libraryPath(dataDir, next.name);
          if (await fs.stat(target).catch(() => undefined)) throw new Error(`技能已存在：${next.name}`);
          await fs.rename(existing.dir, target);
          const entry = state.entries[name] ?? defaultEntry();
          delete state.entries[name];
          state.entries[next.name] = entry;
        }
        const dir = libraryPath(dataDir, next.name);
        await writeSkillDir(dir, { name: next.name, description: next.description, body: next.prompt, frontmatter: existing.frontmatter });
        const entry = mergeEntry(state, next.name);
        state.entries[next.name] = {
          ...entry,
          mode: next.mode,
          category: next.category,
          tags: next.tags,
          argsHint: next.argsHint,
          pinned: next.pinned,
          groups: next.groups,
          updatedAt: Date.now(),
        };
        await writeStateFile(dataDir, state);
        return (await mergeSkills()).actions.find((item) => item.id === next.name);
      });
    },
    async remove(id) {
      return serialize(async () => {
        const name = assertSkillName(id);
        await fs.rm(libraryPath(dataDir, name), { recursive: true, force: true });
        const state = await readState();
        delete state.entries[name];
        await writeStateFile(dataDir, state);
      });
    },
    async touch(id) {
      return serialize(async () => {
        const name = assertSkillName(id);
        const state = await readState();
        const entry = mergeEntry(state, name);
        state.entries[name] = { ...entry, usage: bumpUsage(entry.usage), updatedAt: Date.now() };
        await writeStateFile(dataDir, state);
        return state.entries[name];
      });
    },
    async setActionGroups(id, groups) {
      return serialize(async () => {
        const name = assertSkillName(id);
        const state = await readState();
        const valid = new Set(state.groups.map((group) => group.id));
        const entry = mergeEntry(state, name);
        state.entries[name] = {
          ...entry,
          groups: normalizeGroupIds(groups).filter((groupId) => valid.has(groupId)),
          updatedAt: Date.now(),
        };
        await writeStateFile(dataDir, state);
        return state.entries[name];
      });
    },
    async setGroupActions(id, actionNames, extraNames = []) {
      return serialize(async () => {
        const state = await readState();
        state.groups = normalizeGroups(state.groups);
        if (!state.groups.some((group) => group.id === id)) throw new Error('分组不存在');
        const { skills } = await readLibrary();
        const wanted = new Set((Array.isArray(actionNames) ? actionNames : []).filter((name) => typeof name === 'string'));
        const known = new Set(skills.map((skill) => skill.name));
        for (const name of Object.keys(state.entries)) known.add(name);
        for (const name of Array.isArray(extraNames) ? extraNames : []) {
          if (typeof name === 'string' && name !== '') known.add(name);
        }
        let changed = false;
        for (const name of known) {
          const hasEntry = state.entries[name] !== undefined;
          const entry = mergeEntry(state, name);
          const groups = new Set(entry.groups);
          const should = wanted.has(name);
          if (should) groups.add(id);
          else groups.delete(id);
          const next = [...groups];
          if (next.length === entry.groups.length && next.every((groupId, index) => groupId === entry.groups[index])) continue;
          if (!hasEntry && !should) continue;
          state.entries[name] = { ...entry, groups: next, updatedAt: Date.now() };
          changed = true;
        }
        if (changed) await writeStateFile(dataDir, state);
        return { group: state.groups.find((group) => group.id === id), actions: [...wanted] };
      });
    },
    async setGroupIncludes(id, includeIds) {
      return serialize(async () => {
        const state = await readState();
        state.groups = normalizeGroups(state.groups);
        const group = state.groups.find((entry) => entry.id === id);
        if (group === undefined) throw new Error('分组不存在');
        const ids = new Set(state.groups.map((entry) => entry.id));
        group.includes = normalizeGroupIds(includeIds).filter((child) => child !== id && ids.has(child));
        await writeStateFile(dataDir, state);
        return group;
      });
    },
    async setProjectScope(projectPath, profile = {}) {
      return serialize(async () => {
        const raw = typeof projectPath === 'string' ? projectPath.trim().replace(/[\\/]+$/u, '') : '';
        if (raw === '') throw new Error('项目路径不能为空');
        const state = await readState();
        const groups = normalizeGroups(state.groups);
        const valid = new Set(groups.map((group) => group.id));
        const key = process.platform === 'win32' ? raw.toLowerCase() : raw;
        const existing = state.projects.find((project) => (process.platform === 'win32' ? project.path.toLowerCase() : project.path) === key);
        const entry = {
          path: raw,
          label: typeof profile.label === 'string' && profile.label.trim() !== '' ? profile.label.trim() : (existing?.label ?? path.basename(raw)) || raw,
          groups: normalizeGroupIds(profile.groups).filter((id) => valid.has(id)),
          actions: [...new Set((Array.isArray(profile.actions) ? profile.actions : []).filter((name) => typeof name === 'string' && name.trim() !== '').map((name) => name.trim()))],
          excludeGroups: normalizeGroupIds(profile.excludeGroups).filter((id) => valid.has(id)),
          excludeActions: [...new Set((Array.isArray(profile.excludeActions) ? profile.excludeActions : []).filter((name) => typeof name === 'string' && name.trim() !== '').map((name) => name.trim()))],
        };
        state.projects = state.projects.filter((project) => project !== existing);
        state.projects.push(entry);
        state.groups = groups;
        await writeStateFile(dataDir, state);
        return entry;
      });
    },
    async createGroup(name) {
      return serialize(async () => {
        const display = normalizeGroupName(name);
        if (display === '') throw new Error('分组名不能为空');
        const state = await readState();
        state.groups = normalizeGroups(state.groups);
        if (state.groups.some((group) => group.name.toLowerCase() === display.toLowerCase())) throw new Error('分组已存在');
        let id = display.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');
        if (id === '' || state.groups.some((group) => group.id === id)) id = `g-${randomUUID().slice(0, 8)}`;
        const group = { id, name: display, builtin: false, global: false, includes: [] };
        state.groups.push(group);
        await writeStateFile(dataDir, state);
        return group;
      });
    },
    async renameGroup(id, name) {
      return serialize(async () => {
        const display = normalizeGroupName(name);
        if (display === '') throw new Error('分组名不能为空');
        const state = await readState();
        state.groups = normalizeGroups(state.groups);
        const group = state.groups.find((entry) => entry.id === id);
        if (group === undefined) throw new Error('分组不存在');
        if (state.groups.some((entry) => entry.id !== id && entry.name.toLowerCase() === display.toLowerCase())) throw new Error('分组已存在');
        group.name = display;
        await writeStateFile(dataDir, state);
        return group;
      });
    },
    async setDefaultGroup(id) {
      return serialize(async () => {
        const state = await readState();
        state.groups = normalizeGroups(state.groups);
        const group = state.groups.find((entry) => entry.id === id);
        if (group === undefined) throw new Error('分组不存在');
        state.defaultGroup = group.id;
        await writeStateFile(dataDir, state);
        return group;
      });
    },
    async setGroupGlobal(id, global) {
      return serialize(async () => {
        const state = await readState();
        state.groups = normalizeGroups(state.groups);
        const group = state.groups.find((entry) => entry.id === id);
        if (group === undefined) throw new Error('分组不存在');
        group.global = global === true;
        await writeStateFile(dataDir, state);
        return group;
      });
    },
    async deleteGroup(id) {
      return serialize(async () => {
        const state = await readState();
        state.groups = normalizeGroups(state.groups);
        if (!state.groups.some((group) => group.id === id)) throw new Error('分组不存在');
        if (state.defaultGroup === id) state.defaultGroup = '';
        state.groups = state.groups.filter((group) => group.id !== id);
        state.groups = state.groups.map((group) => ({
          ...group,
          includes: (group.includes ?? []).filter((child) => child !== id),
        }));
        for (const [name, entry] of Object.entries(state.entries)) {
          if (Array.isArray(entry.groups) && entry.groups.includes(id)) {
            state.entries[name] = { ...mergeEntry(state, name), groups: entry.groups.filter((groupId) => groupId !== id), updatedAt: Date.now() };
          }
        }
        state.projects = state.projects.map((project) => ({
          ...project,
          groups: project.groups.filter((groupId) => groupId !== id),
        }));
        await writeStateFile(dataDir, state);
        return state.groups;
      });
    },
    async setMode(id, mode) {
      return serialize(async () => {
        const name = assertSkillName(id);
        const state = await readState();
        const entry = mergeEntry(state, name);
        state.entries[name] = { ...entry, mode: normalizeMode(mode), updatedAt: Date.now() };
        await writeStateFile(dataDir, state);
        return state.entries[name];
      });
    },
    async renameCategory(from, to) {
      return serialize(async () => {
        const state = await readState();
        let changed = 0;
        for (const [name, entry] of Object.entries(state.entries)) {
          if (entry.category === from) {
            state.entries[name] = { ...mergeEntry(state, name), category: to, updatedAt: Date.now() };
            changed += 1;
          }
        }
        await writeStateFile(dataDir, state);
        return changed;
      });
    },
    async deleteCategory(name) {
      return serialize(async () => {
        const state = await readState();
        let changed = 0;
        for (const [key, entry] of Object.entries(state.entries)) {
          if (entry.category === name) {
            state.entries[key] = { ...mergeEntry(state, key), category: '', updatedAt: Date.now() };
            changed += 1;
          }
        }
        await writeStateFile(dataDir, state);
        return changed;
      });
    },
  };
}

export { describeError };
