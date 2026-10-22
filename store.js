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

import { normalizeResourceMeta } from './resources.js';

export const STORE_VERSION = 1;
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
  return path.join(home, 'action-hub');
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
 * Create the durable store over one JSON file.
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
  const file = path.join(dataDir, 'actions.json');
  const seed = options.seed !== false;
  let loaded = null;
  let queue = Promise.resolve();

  async function load() {
    if (loaded !== null) return loaded;
    try {
      const text = await fs.readFile(file, 'utf8');
      loaded = parseState(text, seed);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      loaded = seed ? seedState() : emptyState();
      await persist(loaded);
    }
    return loaded;
  }

  async function persist(state) {
    await fs.mkdir(dataDir, { recursive: true });
    const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await fs.rename(temporary, file);
  }

  async function mutate(mutator) {
    const run = queue.then(async () => {
      const state = await load();
      const draft = { ...state, actions: [...state.actions], updatedAt: Date.now() };
      const result = await mutator(draft);
      if (draft.actions !== state.actions) {
        draft.actions = sortActions(draft.actions);
        loaded = draft;
        await persist(draft);
      }
      return { state: loaded, result };
    });
    queue = run.catch(() => {});
    return run;
  }

  return { filePath: () => file, read: load, mutate };
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
