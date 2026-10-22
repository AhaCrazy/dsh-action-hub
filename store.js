/**
 * dsh-action-hub — durable Action store (Host half, no framework imports).
 *
 * One JSON document holds every Action. Writes are serialized through a promise
 * chain and land atomically (temp file + rename) so a crash cannot truncate the
 * collection, and two concurrent UI calls cannot interleave partial state.
 *
 * This module stays importable by a plain `node --test` run: it uses only node
 * builtins, never `@deepseek-ai/*`, because a workspace bundle is linked into
 * the profile from outside it and bare packages would not resolve.
 *
 * @module dsh-action-hub/store
 */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { normalizeResourceMeta, actionDir, legacyResourceDir, listResources, removeActionDir, resourceDir } from './resources.js';

export const STORE_VERSION = 2;
export const MAX_PROMPT = 60000;
export const MAX_NAME = 80;
export const MAX_DESCRIPTION = 600;
export const MAX_CATEGORY = 40;
export const MAX_TAGS = 12;
export const MAX_TAG = 24;

/** Placeholder spellings replaced when an Action is inserted into the composer. */
export const ARG_PLACEHOLDERS = ['{{args}}', '{{ARGS}}', '$ARGUMENTS', '{{input}}'];

/**
 * Resolve the profile data directory. `DSH_HOME` is set by a profile-launched
 * Harness; the fallback keeps tests and a bare bootstrap working.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {string} absolute directory for this plugin's data.
 */
export function defaultDataDir(env = process.env) {
  const home = env.DSH_HOME && env.DSH_HOME.trim() !== ''
    ? env.DSH_HOME
    : path.join(os.homedir(), '.dsh');
  return path.join(home, 'dsh-action-hub');
}

/**
 * Turn a display name into a readable, stable id stem.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  const source = typeof name === 'string' ? name : '';
  const ascii = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return ascii === '' ? 'action' : ascii.slice(0, 48);
}

/**
 * Mint an Action id. The random suffix keeps two same-named Actions distinct and
 * survives renaming, so exports stay mergeable across machines.
 * @param {string} [name]
 * @returns {string}
 */
export function mintId(name) {
  const random = Math.random().toString(16).slice(2, 8);
  return `${slugify(name)}-${random}`;
}

/**
 * Expand the argument placeholders of one prompt. `{{date}}` / `{{DATE}}` are
 * available too, so a dated journal Action stays useful without editing it.
 *
 * @param {string} prompt
 * @param {{ args?: string, now?: Date }} [context]
 * @returns {string}
 */
export function expandPrompt(prompt, context = {}) {
  const text = typeof prompt === 'string' ? prompt : '';
  const args = typeof context.args === 'string' ? context.args.trim() : '';
  const now = context.now instanceof Date ? context.now : new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  let expanded = text;
  for (const token of ARG_PLACEHOLDERS) expanded = expanded.split(token).join(args);
  expanded = expanded.split('{{date}}').join(date).split('{{DATE}}').join(date);
  if (args !== '' && !hasArgumentPlaceholder(text)) expanded = `${expanded}\n\n${args}`;
  // A placeholder left empty leaves blank lines behind; tidy them so the
  // inserted prompt does not open with a run of empty paragraphs.
  return expanded.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trimEnd();
}

/**
 * Whether a prompt contains a placeholder that `expandPrompt` fills with args.
 * @param {string} prompt
 * @returns {boolean}
 */
export function hasArgumentPlaceholder(prompt) {
  const text = typeof prompt === 'string' ? prompt : '';
  return ARG_PLACEHOLDERS.some((token) => text.includes(token));
}

/**
 * Coerce one untrusted Action input into the stored shape. Unknown fields are
 * dropped so an imported or hand-edited document cannot smuggle state through.
 *
 * @param {unknown} input
 * @param {{ id?: string, previous?: object, now?: number }} [options]
 * @returns {object} normalized Action
 */
export function normalizeAction(input, options = {}) {
  const source = input !== null && typeof input === 'object' ? input : {};
  const now = typeof options.now === 'number' ? options.now : Date.now();
  const previous = options.previous !== null && typeof options.previous === 'object' ? options.previous : {};
  const text = (value) => (typeof value === 'string' ? value.trim() : '');
  const name = text(source.name).slice(0, MAX_NAME) || text(previous.name).slice(0, MAX_NAME) || '未命名 Action';
  const category = text(source.category).slice(0, MAX_CATEGORY);
  const tags = Array.isArray(source.tags)
    ? [...new Set(source.tags.map((tag) => text(tag).slice(0, MAX_TAG)).filter((tag) => tag !== ''))].slice(0, MAX_TAGS)
    : [];
  const prompt = typeof source.prompt === 'string' ? source.prompt.slice(0, MAX_PROMPT) : '';
  const id = text(options.id) || text(source.id) || text(previous.id) || mintId(name);
  const createdAt = typeof previous.createdAt === 'number'
    ? previous.createdAt
    : typeof source.createdAt === 'number' ? source.createdAt : now;
  const usagePrevious = previous.usage !== null && typeof previous.usage === 'object' ? previous.usage : {};
  const usageSource = source.usage !== null && typeof source.usage === 'object' ? source.usage : usagePrevious;
  const usage = {
    count: Number.isFinite(usageSource.count) && usageSource.count > 0 ? Math.floor(usageSource.count) : 0,
    lastAt: Number.isFinite(usageSource.lastAt) && usageSource.lastAt > 0 ? Math.round(usageSource.lastAt) : 0,
  };
  const pinned = typeof source.pinned === 'boolean'
    ? source.pinned
    : previous.pinned === true;
  const resourcesSource = Array.isArray(source.resources)
    ? source.resources
    : Array.isArray(previous.resources) ? previous.resources : [];
  const resources = normalizeResourceMeta(resourcesSource);
  const sourceRef = previous.source !== null && typeof previous.source === 'object'
    ? previous.source
    : source.source !== null && typeof source.source === 'object' ? source.source : undefined;
  const action = {
    id,
    name,
    description: text(source.description).slice(0, MAX_DESCRIPTION) || text(previous.description).slice(0, MAX_DESCRIPTION),
    category,
    tags,
    prompt: prompt !== '' ? prompt : typeof previous.prompt === 'string' ? previous.prompt : '',
    argsHint: text(source.argsHint).slice(0, 120) || text(previous.argsHint).slice(0, 120),
    pinned,
    resources,
    createdAt,
    updatedAt: now,
    usage,
  };
  if (sourceRef !== undefined) {
    action.source = {
      kind: text(sourceRef.kind) || 'imported',
      name: text(sourceRef.name),
    };
    if (text(sourceRef.detail)) action.source.detail = text(sourceRef.detail);
    if (text(sourceRef.importedFingerprint)) action.source.importedFingerprint = text(sourceRef.importedFingerprint);
    if (text(sourceRef.importedAt)) action.source.importedAt = text(sourceRef.importedAt);
  }
  return action;
}

/**
 * Validate an Action as the UI presents it, returning a machine-readable reason
 * instead of throwing, so a form can show the message next to the field.
 *
 * @param {object} action
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function validateAction(action) {
  if (typeof action?.name !== 'string' || action.name.trim() === '') {
    return { ok: false, code: 'name-required', message: 'Action 需要一个名称' };
  }
  if (typeof action?.prompt !== 'string' || action.prompt.trim() === '') {
    return { ok: false, code: 'prompt-required', message: 'Action 需要提示词正文' };
  }
  return { ok: true };
}

/**
 * Sort Actions for display: pinned first, then most recently used, then by
 * category and name. The palette and the management page both consume this
 * order, so a pinned Action is one keystroke away after "star" is toggled.
 *
 * @param {readonly object[]} actions
 * @returns {object[]}
 */
export function sortActions(actions) {
  return [...actions].sort((left, right) => {
    const pinned = (right.pinned === true ? 1 : 0) - (left.pinned === true ? 1 : 0);
    if (pinned !== 0) return pinned;
    const usedLeft = left.usage?.lastAt ?? 0;
    const usedRight = right.usage?.lastAt ?? 0;
    if (usedLeft !== usedRight) return usedRight - usedLeft;
    const category = (left.category || '').localeCompare(right.category || '', 'zh-CN');
    if (category !== 0) return category;
    return (left.name || '').localeCompare(right.name || '', 'zh-CN');
  });
}

/**
 * Case-insensitive match over name, description, category, tags, and prompt.
 * @param {object} action
 * @param {string} query
 * @returns {boolean}
 */
export function matchesQuery(action, query) {
  const needle = typeof query === 'string' ? query.trim().toLowerCase() : '';
  if (needle === '') return true;
  const haystack = [
    action?.name,
    action?.description,
    action?.category,
    Array.isArray(action?.tags) ? action.tags.join(' ') : '',
    action?.prompt,
  ]
    .filter((part) => typeof part === 'string')
    .join('\n')
    .toLowerCase();
  return needle.split(/\s+/).every((part) => haystack.includes(part));
}

/**
 * Merge imported Actions into a collection. `merge` keeps existing ids and adds
 * anything new (same id updates the content); `replace` swaps the whole set.
 *
 * @param {readonly object[]} current
 * @param {readonly object[]} incoming
 * @param {'merge' | 'replace'} mode
 * @returns {{ actions: object[], added: number, updated: number }}
 */
export function mergeActions(current, incoming, mode = 'merge') {
  const normalized = (Array.isArray(incoming) ? incoming : [])
    .slice(0, 5000)
    .map((entry) => normalizeAction(entry));
  if (mode === 'replace') return { actions: normalized, added: normalized.length, updated: 0 };
  const byId = new Map(current.map((action) => [action.id, action]));
  let added = 0;
  let updated = 0;
  for (const action of normalized) {
    const previous = byId.get(action.id);
    if (previous === undefined) {
      added += 1;
      byId.set(action.id, action);
    } else {
      updated += 1;
      byId.set(action.id, normalizeAction(action, { id: previous.id, previous }));
    }
  }
  return { actions: [...byId.values()], added, updated };
}

/** The three starter Actions a fresh install receives (disable with `seed: false`). */
export const SEED_ACTIONS = [
  {
    name: '代码审查',
    description: '审查当前工作区的改动，按严重程度列出问题并给出最小修复建议。',
    category: '开发',
    tags: ['review', 'diff'],
    argsHint: '可选：重点关注的文件或模块',
    prompt: [
      '请审查当前工作区的改动。',
      '',
      '1. 先运行 `git status --short` 和 `git diff`（必要时用 `git diff --staged`）确认改动范围。',
      '2. 按「必须修复 / 建议修改 / 可以忽略」三档列出问题，每条给出文件:行号、问题原因和最小修复方案。',
      '3. 重点检查：逻辑错误、边界条件、错误处理、并发/资源泄漏、安全风险、与既有约定不一致的地方。',
      '4. 不要修改代码；如果发现严重问题，明确说清复现路径。',
      '',
      '{{args}}',
    ].join('\n'),
  },
  {
    name: '提交信息',
    description: '根据暂存区改动写一条符合 Conventional Commits 的提交信息。',
    category: '开发',
    tags: ['git', 'commit'],
    argsHint: '可选：想强调的改动点',
    prompt: [
      '请根据暂存区（必要时结合未暂存）的改动，生成一条 Git 提交信息。',
      '',
      '要求：',
      '- 格式：`<type>(<scope>): <subject>`，type 用 feat/fix/refactor/docs/test/build/chore 之一。',
      '- subject 使用英文、祈使句、不超过 72 个字符，不加句号。',
      '- 正文用中文列出 2–5 条要点，说明「为什么改」而不是复述 diff。',
      '- 先给我看提交信息，不要执行 `git commit`。',
      '',
      '{{args}}',
    ].join('\n'),
  },
  {
    name: '会话小结',
    description: '把当前会话的结论、已改文件、未决问题和下一步整理成可交接的摘要。',
    category: '效率',
    tags: ['summary', 'handoff'],
    argsHint: '可选：下一位接手的人/角色',
    prompt: [
      '请把当前会话整理成一份可交接的小结，包含：',
      '',
      '1. 目标与最终结论（一两句话）。',
      '2. 已完成的工作与关键决策，附带改动过的文件路径。',
      '3. 遇到并解决的问题、踩过的坑。',
      '4. 未决问题与风险。',
      '5. 下一步建议（可执行的具体动作）。',
      '',
      '如果某些信息只能从会话早期获得，请回看上下文后再写，不要编造。',
      '',
      '{{args}}',
    ].join('\n'),
  },
];

/**
 * Built-in helper (installed once for every library) that turns a Skill folder
 * or a piece of text into an importable Action bundle. It is an ordinary Action:
 * no special host capability is attached to it.
 */
export const DEFAULT_ACTIONS = [
  {
    id: 'action-import-assistant',
    name: 'Action 导入助手',
    description: '把指定 Skill 目录或一段文本整理成可导入的 Action 包，必要时先和用户确认。',
    category: '内置',
    tags: ['内置', '导入'],
    argsHint: 'Skill 目录路径，或要保存为 Action 的文本',
    prompt: [
      '你是 Action Hub 的导入助手。根据用户给出的内容完成一种任务：',
      '',
      'A. 如果用户给出一个 Skill 目录（或 SKILL.md 路径）：',
      '1. 读取 SKILL.md 和同目录里的资源文件；先比较内容，必要时问用户要保留哪些文件。',
      '2. 按 Action Hub 的语义转换：Action 只由用户显式调用，不注册 Skill、不自动触发；prompt 要能独立执行；可以把用户输入改成 {{args}}。',
      '3. 在用户指定（或确认）的目标目录创建 Action 包：',
      '   <目标目录>/<action-id>/action.json',
      '   <目标目录>/<action-id>/files/...',
      '4. action.json 结构：',
      '   {',
      '     "format": "dsh-action-hub/action@1",',
      '     "action": { "name": "...", "description": "...", "category": "...", "tags": ["..."], "argsHint": "...", "prompt": "..." },',
      '     "resources": [ { "name": "相对路径", "bytes": 123 } ]',
      '   }',
      '   resources 只保存真正需要的代码/模板/文档；files/ 下的路径要与 name 对应。',
      '',
      'B. 如果用户给出一段要保存的文本（例如当前输入框内容）：',
      '1. 先问清 Action 名称、分类和参数提示；信息不足时一次只问一个问题。',
      '2. 生成同样的 Action 包；只有确实需要附带的模板/附件才放进 files/。',
      '',
      '完成后告诉用户：在 Action Hub →「导入」→「Action 包」选择该目录（或把目录压缩成 ZIP 后选择 ZIP）。',
      '如果当前环境无法写文件，就把 action.json 的完整内容贴在回复里，让用户用「导入 → 粘贴 JSON」粘贴。',
      '',
      '用户输入：',
      '{{args}}',
    ].join('\n'),
  },
];

/**
 * Install the built-in helper exactly once per library. The marker keeps a user
 * who deletes it from getting it back on every plugin start.
 *
 * @param {{ read: Function, mutate: Function }} store
 * @param {string} dataDir
 * @returns {Promise<void>}
 */
export async function installDefaultActions(store, dataDir) {
  const marker = path.join(dataDir, '.defaults-v1');
  if (await fs.access(marker).then(() => true).catch(() => false)) return;
  const state = await store.read();
  const existing = new Set(state.actions.map((action) => action.id));
  const missing = DEFAULT_ACTIONS.filter((entry) => !existing.has(entry.id));
  if (missing.length > 0) {
    await store.mutate((draft) => {
      draft.actions = [...draft.actions, ...missing.map((entry) => normalizeAction(entry, { now: Date.now() }))];
    });
  }
  await fs.writeFile(marker, `${Date.now()}\n`, 'utf8').catch(() => undefined);
}

/**
 * Create the durable per-Action store.
 *
 * Each Action is one self-contained directory:
 *
 *   <dataDir>/actions/<id>/action.json   metadata, prompt, resource manifest
 *   <dataDir>/actions/<id>/files/...     resource bytes
 *
 * A pre-4.0 `actions.json` plus `resources/<hash>/` layout is migrated once
 * (copies are written first, then the legacy file/directory is renamed aside).
 *
 * @param {{ dataDir?: string, seed?: boolean }} [options]
 * @returns {{
 *   filePath(): string,
 *   read(): Promise<{ version: number, actions: object[], updatedAt: number }>,
 *   mutate(mutator: (state: object) => unknown): Promise<{ state: object, result: unknown }>,
 * }}
 */
export function createStore(options = {}) {
  const dataDir = options.dataDir && options.dataDir.trim() !== '' ? options.dataDir : defaultDataDir();
  const actionsRoot = path.join(dataDir, 'actions');
  const legacyFile = path.join(dataDir, 'actions.json');
  const marker = path.join(dataDir, '.layout-v2');
  const seed = options.seed !== false;
  let loaded = null;
  let queue = Promise.resolve();

  async function exists(target) {
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }

  async function writeActionDocument(action) {
    const dir = actionDir(dataDir, action.id);
    await fs.mkdir(dir, { recursive: true });
    const document = {
      format: 'dsh-action-hub/action@1',
      action,
    };
    const file = path.join(dir, 'action.json');
    const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    await fs.rename(temporary, file);
  }

  async function readActionDocument(dir) {
    const file = path.join(dir, 'action.json');
    const text = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(text);
    const raw = parsed !== null && typeof parsed === 'object' && parsed.action !== null && typeof parsed.action === 'object'
      ? parsed.action
      : parsed;
    const action = normalizeAction(raw);
    // The Action folder is the source of truth: files placed in `files/` by the
    // user (outside the plugin) must show up without editing action.json.
    action.resources = await listResources(path.join(dir, 'files'));
    return action;
  }

  /**
   * Rename the pre-5.0.3 default directory (`action-hub`) to the plugin-named
   * `dsh-action-hub` once. Only the default location is migrated; a custom
   * `dataDir` is never touched.
   */
  async function migrateLegacyDataDir() {
    const parent = path.dirname(dataDir);
    if (dataDir !== path.join(parent, 'dsh-action-hub')) return;
    const legacy = path.join(parent, 'action-hub');
    if (!(await exists(legacy)) || await exists(dataDir)) return;
    try {
      await fs.rename(legacy, dataDir);
    } catch {
      // Cross-device or a held directory: copy, then clear the old tree so the
      // next start does not see two libraries.
      await fs.cp(legacy, dataDir, { recursive: true, errorOnExist: true });
      await fs.rm(legacy, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => undefined);
    }
  }

  async function ensureLayout() {
    await migrateLegacyDataDir();
    await fs.mkdir(actionsRoot, { recursive: true });
    const hasLegacy = await exists(legacyFile);
    if (!hasLegacy) return;
    const entries = await fs.readdir(actionsRoot).catch(() => []);
    if (entries.length > 0) return; // already has data; keep the legacy copy untouched
    let parsed;
    try {
      parsed = parseState(await fs.readFile(legacyFile, 'utf8'), false);
    } catch {
      return;
    }
    for (const action of parsed.actions) {
      await writeActionDocument(action);
      const legacyDir = legacyResourceDir(dataDir, action.id);
      if (await exists(legacyDir)) {
        await fs.mkdir(resourceDir(dataDir, action.id), { recursive: true });
        await fs.cp(legacyDir, resourceDir(dataDir, action.id), { recursive: true, force: true });
      }
    }
    const stamp = Date.now();
    await fs.rename(legacyFile, `${legacyFile}.migrated-${stamp}`).catch(() => undefined);
    const legacyResources = path.join(dataDir, 'resources');
    if (await exists(legacyResources)) {
      await fs.rename(legacyResources, `${legacyResources}.migrated-${stamp}`).catch(() => undefined);
    }
    await fs.writeFile(marker, `${stamp}\n`, 'utf8').catch(() => undefined);
  }

  async function load() {
    await ensureLayout();
    const entries = await fs.readdir(actionsRoot, { withFileTypes: true }).catch(() => []);
    const actions = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      try {
        actions.push(await readActionDocument(path.join(actionsRoot, entry.name)));
      } catch {
        /* an unreadable Action is skipped rather than taking down the shelf */
      }
    }
    if (actions.length === 0 && seed && !(await exists(marker))) {
      const seeded = seedState();
      for (const action of seeded.actions) await writeActionDocument(action);
      loaded = seeded;
      await fs.writeFile(marker, `${Date.now()}\n`, 'utf8').catch(() => undefined);
      return loaded;
    }
    loaded = {
      version: STORE_VERSION,
      actions: sortActions(actions),
      updatedAt: Date.now(),
    };
    return loaded;
  }

  async function mutate(mutator) {
    const run = queue.then(async () => {
      const state = await load();
      const draft = { ...state, actions: [...state.actions], updatedAt: Date.now() };
      const result = await mutator(draft);
      draft.actions = sortActions(draft.actions);
      const previous = new Map(state.actions.map((action) => [action.id, JSON.stringify(action)]));
      const next = new Map(draft.actions.map((action) => [action.id, JSON.stringify(action)]));
      for (const action of draft.actions) {
        if (previous.get(action.id) !== next.get(action.id)) await writeActionDocument(action);
      }
      for (const action of state.actions) {
        if (!next.has(action.id)) await removeActionDir(dataDir, action.id);
      }
      loaded = { ...draft, actions: draft.actions };
      return { state: loaded, result };
    });
    queue = run.catch(() => {});
    return run;
  }

  return { filePath: () => actionsRoot, read: load, mutate };
}

/**
 * Parse a stored document, tolerating a bare array from a hand-edited file.
 * @param {string} text
 * @param {boolean} seed
 * @returns {{ version: number, actions: object[], updatedAt: number }}
 */
export function parseState(text, seed) {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.actions) ? parsed.actions : null;
  if (list === null) throw new Error('actions.json 结构无效：缺少 actions 数组');
  return {
    version: STORE_VERSION,
    actions: sortActions(list.map((entry) => normalizeAction(entry))),
    updatedAt: Number.isFinite(parsed?.updatedAt) ? parsed.updatedAt : Date.now(),
  };
}

/** @returns {{ version: number, actions: object[], updatedAt: number }} */
export function emptyState() {
  return { version: STORE_VERSION, actions: [], updatedAt: Date.now() };
}

/** @returns {{ version: number, actions: object[], updatedAt: number }} */
export function seedState() {
  const now = Date.now();
  return {
    version: STORE_VERSION,
    actions: SEED_ACTIONS.map((entry, index) => normalizeAction(entry, { now: now - (SEED_ACTIONS.length - index) * 1000 })),
    updatedAt: now,
  };
}
