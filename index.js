/**
 * dsh-action-hub — Host half.
 *
 * Owns the durable Action collection and the small same-origin HTTP surface the
 * Web UI calls. Deliberately registers NO agent tool and adds no prompt text:
 * an Action reaches a conversation only when the user picks it, so a large
 * collection never costs context tokens and the model cannot invoke one.
 *
 * The bundle is linked into the profile from the workspace, so this module
 * imports node builtins and its own files only; a bare `@deepseek-ai/*` specifier
 * would not resolve from a linked package.
 *
 * @module dsh-action-hub
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import nodePath from 'node:path';

import { prepareAssist, startAssistWatcher } from './assist.js';
import {
  addResourceFile,
  copyResources,
  copySkillResources,
  deleteResourceFile,
  exportResourceFiles,
  readInvocationResources,
  readResourcePreviews,
  removeResources,
  resourceDir,
  writeResourceEntries,
} from './resources.js';
import {
  MAX_PROMPT,
  createStore,
  defaultDataDir,
  expandPrompt,
  mergeActions,
  normalizeAction,
  sortActions,
  validateAction,
} from './store.js';

export const name = 'action-hub';

/** The Web UI is the product, so the HTTP carrier is a hard dependency. */
export const inject = ['webServer'];

const ROUTE = '/api/dsh-action-hub';
const MAX_BODY = 40 * 1024 * 1024;
const IMPORT_CATEGORY = '导入';
const ACTION_PREFIX = 'ah-';
const MARKER_PATTERN = /(^|\s)\/(ah-[0-9a-f]{10})(?![0-9a-f])/gu;

/**
 * Stable, opaque reference marker for one Action. The id survives renames, so
 * a marker already sitting in a draft keeps resolving.
 *
 * @param {string} id
 * @returns {string}
 */
function actionMarker(id) {
  return `${ACTION_PREFIX}${createHash('sha1').update(String(id)).digest('hex').slice(0, 10)}`;
}

/**
 * Map every Action to the opaque `/ah-…` marker that references it. The hash is
 * intentionally not the display name: the transcript chip shows the Action name,
 * while this handle is only the wire spelling.
 *
 * @param {readonly object[]} actions
 * @returns {{ handles: Map<string, string>, entries: Array<{ action: object, name: string }> }}
 */
export function planActionRefs(actions) {
  const used = new Set();
  const handles = new Map();
  const entries = [];
  for (const action of actions) {
    let name = actionMarker(action.id);
    let suffix = 2;
    while (used.has(name)) name = `${actionMarker(action.id)}-${suffix++}`;
    used.add(name);
    handles.set(action.id, name);
    entries.push({ action, name });
  }
  return { handles, entries };
}

/**
 * Collect the references a claimed batch of direct user messages carries.
 * Only `source.kind === 'user'` text is scanned, so injected context can never
 * forge an invocation.
 *
 * @param {readonly object[]} messages
 * @param {ReadonlySet<string>} known - markers that resolve to an existing Action.
 * @returns {string[]} unique markers, in first-seen order.
 */
export function referencedActions(messages, known) {
  const found = [];
  for (const message of messages) {
    if (message?.role !== 'user' || message.source?.kind !== 'user') continue;
    for (const block of Array.isArray(message.content) ? message.content : []) {
      if (block?.type !== 'text' || typeof block.text !== 'string') continue;
      for (const match of block.text.matchAll(MARKER_PATTERN)) {
        const marker = match[2];
        if (marker !== undefined && known.has(marker) && !found.includes(marker)) found.push(marker);
      }
    }
  }
  return found;
}

/**
 * Build the durable, model-facing injection for one explicitly invoked Action.
 * It is appended to the step like a Skill invocation, so later steps keep it in
 * history, but it uses our own source kind — Action references are not Skills
 * and never appear in the Skill catalog or the `/` menu. Small text resources
 * are inlined; everything else is listed by path for on-demand reads.
 *
 * @param {object} action
 * @param {{ basePath?: string, files?: Array<{ name: string, bytes: number, text?: string, path: string }> }} [context]
 * @returns {object} a plain user-role message.
 */
export function actionInvocationMessage(action, context = undefined) {
  const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const name = escape(action.name);
  const body = expandPrompt(action.prompt, { date: new Date() });
  const files = Array.isArray(context?.files) ? context.files : [];
  const parts = [`<action_content name="${name}">`];
  if (files.length > 0) {
    parts.push(`<action_resources base="${escape(context.basePath ?? '')}">`);
    for (const file of files) {
      if (typeof file.text === 'string') {
        parts.push(`<action_file name="${escape(file.name)}">\n${file.text}\n</action_file>`);
      } else {
        parts.push(`<action_file name="${escape(file.name)}" path="${escape(file.path)}" bytes="${file.bytes}"/>`);
      }
    }
    parts.push('</action_resources>');
    parts.push('The files above are local resources for this Action. Read any file you need with the file tools before applying it.');
  }
  parts.push('<action_instructions>', body, '</action_instructions>', '</action_content>');
  return {
    id: `action-${globalThis.crypto.randomUUID()}`,
    role: 'user',
    content: [{ type: 'text', text: parts.join('\n') }],
    source: { kind: 'action', name: action.name, form: 'instructions' },
  };
}

/**
 * Install the user-invoked Action expander. A `/ah-…` marker in a direct user
 * message becomes an `<action_content>` message for the model; the durable log
 * still holds the marker, so the transcript can show only the Action name.
 *
 * @param {object} ctx
 * @param {ReturnType<typeof createStore>} store
 */
function installActionInvocations(ctx, store, dataDir) {
  return ctx.on('agent/pre-step', async ({ messages, signal }, next) => {
    const decision = await next();
    if (decision.kind === 'reject' || signal.aborted) return decision;
    const direct = messages.filter((message) => message?.source?.kind === 'user');
    if (direct.length === 0) return decision;
    const hasMarker = direct.some((message) => (message.content ?? []).some(
      (block) => block?.type === 'text' && typeof block.text === 'string' && /(^|\s)\/ah-[0-9a-f]{10}(?![0-9a-f])/.test(block.text),
    ));
    if (!hasMarker) return decision;
    let plan;
    try {
      const state = await store.read();
      plan = planActionRefs(sortActions(state.actions));
    } catch (error) {
      ctx.logger?.warn?.(`dsh-action-hub: could not read Actions for an invocation: ${describe(error)}`);
      return decision;
    }
    const byHandle = new Map(plan.entries.map((entry) => [entry.name, entry.action]));
    const markers = referencedActions(messages, new Set(byHandle.keys()));
    if (markers.length === 0) return decision;
    const injections = await Promise.all(markers.map(async (marker) => {
      const action = byHandle.get(marker);
      const context = await readInvocationResources(dataDir, action);
      return actionInvocationMessage(action, context);
    }));
    return {
      ...decision,
      messages: [...decision.messages, ...injections],
    };
  });
}

/**
 * Register the store route.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin Host context.
 * @param {{ dataDir?: string, seed?: boolean }} [config] - the row's config.
 */
export function apply(ctx, config = {}) {
  const dataDir = typeof config.dataDir === 'string' && config.dataDir.trim() !== ''
    ? config.dataDir.trim()
    : defaultDataDir();
  const store = createStore({ dataDir, seed: config.seed !== false });
  ctx.effect(() => installActionInvocations(ctx, store, dataDir), 'action-hub: action invocations');
  ctx.effect(() => startAssistWatcher(ctx, store, dataDir), 'action-hub: AI import inbox');

  // The command registry may finish activating after this row; a child context
  // waits for it instead of dropping the command when it is momentarily absent.
  const attachCommand = (commandCtx) => {
    commandCtx.effect(
      () => commandCtx.commands.register(buildCommand(ctx, store)),
      'action-hub: /action command',
    );
  };
  if (typeof ctx.inject === 'function') {
    ctx.inject(['commands'], attachCommand);
  } else {
    const commands = ctx.get('commands');
    if (commands !== undefined) ctx.effect(() => commands.register(buildCommand(ctx, store)), 'action-hub: /action command');
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: (req, res) => handle(ctx, store, dataDir, req, res),
  }), 'action-hub: API route');
}

/**
 * Resolve the Action a `/action` line names: exact name first (case
 * insensitive), then an exact id, then a unique id prefix.
 *
 * @param {readonly object[]} actions
 * @param {string} raw - the text after `/action`.
 * @returns {{ action?: object, args: string, error?: string }}
 */
export function parseActionCommand(actions, raw) {
  const line = typeof raw === 'string' ? raw.trim() : '';
  if (line === '') return { args: '', error: '' };
  const [head, ...rest] = line.split(/\s+/u);
  const args = rest.join(' ');
  const name = head.toLowerCase();
  const byName = actions.filter((action) => action.name.toLowerCase() === name);
  if (byName.length === 1) return { action: byName[0], args };
  if (byName.length > 1) return { args, error: `有多个同名 Action「${head}」，请改用 id` };
  const byId = actions.filter((action) => action.id.toLowerCase() === name || action.id.toLowerCase().startsWith(name));
  if (byId.length === 1) return { action: byId[0], args };
  if (byId.length > 1) return { args, error: `「${head}」匹配到多个 Action，请写得更完整` };
  return { args, error: `没有找到 Action「${head}」` };
}

/**
 * Build the human command `/action`. It runs from a Host half, so the prompt
 * becomes a real user turn through the same endpoint the composer uses.
 *
 * @param {object} ctx
 * @param {ReturnType<typeof createStore>} store
 * @returns {object} CommandDefinition
 */
function buildCommand(ctx, store) {
  return {
    name: 'action',
    description: '运行 Action 收藏夹里的一条提示词 / Run a saved Action by name',
    input: { hint: '<名称> [参数]' },
    async handler(invocation) {
      const state = await store.read();
      const actions = sortActions(state.actions);
      const parsed = parseActionCommand(actions, invocation.rawInput);
      if (parsed.error !== '') return { kind: 'error', text: parsed.error };
      if (parsed.action === undefined) {
        const names = actions.slice(0, 40).map((action) => action.name);
        const listing = names.length === 0 ? '收藏夹里还没有 Action。' : `可用 Action：${names.join('、')}`;
        return { kind: 'success', text: `${listing}\n用法：/action <名称> [参数]` };
      }
      const sessionController = ctx.get('sessionController');
      if (sessionController === undefined) {
        return { kind: 'error', text: '当前 Profile 未提供会话服务，无法运行 Action' };
      }
      const prompt = expandPrompt(parsed.action.prompt, { args: parsed.args });
      await sessionController.prompt({
        requestId: globalThis.crypto.randomUUID(),
        sessionId: invocation.agent.id,
        mode: 'queue',
        content: [{ type: 'text', text: prompt }],
      }, invocation.signal);
      await store.mutate((draft) => {
        draft.actions = draft.actions.map((entry) => (entry.id === parsed.action.id
          ? { ...entry, usage: { count: (entry.usage?.count ?? 0) + 1, lastAt: Date.now() } }
          : entry));
      });
      return { kind: 'success', text: `已运行 Action「${parsed.action.name}」` };
    },
  };
}

/**
 * Dispatch one request. Every branch answers JSON `{ ok }`.
 *
 * @param {object} ctx
 * @param {ReturnType<typeof createStore>} store
 * @param {string} dataDir
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handle(ctx, store, dataDir, req, res) {
  try {
    if (!originAllowed(ctx, req)) {
      sendJson(res, 403, { ok: false, error: '拒绝跨站请求' });
      return;
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    const route = url.pathname.slice(ROUTE.length).replace(/\/+$/, '') || '/';
    const method = req.method ?? 'GET';

    if (method === 'GET' && route === '/state') {
      const state = await store.read();
      const actions = sortActions(state.actions);
      const plan = planActionRefs(actions);
      sendJson(res, 200, {
        ok: true,
        version: state.version,
        actions,
        meta: {
          dataFile: store.filePath(),
          dataFileDisplay: displayPath(store.filePath()),
          skills: ctx.get('skills') !== undefined,
          referencing: true,
          handles: Object.fromEntries(plan.handles),
        },
      });
      return;
    }

    if (method === 'GET' && route === '/skills') {
      const skills = ctx.get('skills');
      if (skills === undefined) {
        sendJson(res, 200, { ok: true, skills: [], unavailable: '当前 Profile 未启用 Skills 服务' });
        return;
      }
      const cwd = await resolveCwd(ctx, url.searchParams.get('cwd'));
      let summaries = [];
      let warning;
      try {
        summaries = await skills.list({ cwd });
      } catch (error) {
        warning = describe(error);
      }
      sendJson(res, 200, {
        ok: true,
        cwd,
        skills: summaries.map((skill) => ({
          name: skill.name,
          description: skill.description,
          source: skill.source,
          whenToUse: skill.whenToUse,
          ...(typeof skill.path === 'string' ? { path: skill.path } : {}),
        })),
        warning,
      });
      return;
    }

    if (method === 'GET' && route === '/resources') {
      const id = url.searchParams.get('id') ?? '';
      const state = await store.read();
      const action = state.actions.find((entry) => entry.id === id);
      if (action === undefined) {
        sendJson(res, 404, { ok: false, error: 'Action 不存在' });
        return;
      }
      const files = await readResourcePreviews(resourceDir(dataDir, action.id), action.resources);
      sendJson(res, 200, { ok: true, files });
      return;
    }

    if (method === 'GET' && route === '/export') {
      const state = await store.read();
      const actions = await Promise.all(sortActions(state.actions).map(async (action) => ({
        ...exportable(action),
        resources: await exportResourceFiles(resourceDir(dataDir, action.id), action.resources),
      })));
      sendJson(res, 200, {
        ok: true,
        exportedAt: new Date().toISOString(),
        plugin: 'dsh-action-hub',
        version: state.version,
        actions,
      });
      return;
    }

    if (method !== 'POST') {
      sendJson(res, 405, { ok: false, error: `不支持的请求：${method} ${route}` });
      return;
    }

    const body = await readJsonBody(req);
    if (body === undefined) {
      sendJson(res, 400, { ok: false, error: '请求体必须是 JSON' });
      return;
    }

    if (route === '/assist/prepare') {
      const skillPath = text(body.path);
      if (skillPath === '') {
        sendJson(res, 400, { ok: false, error: '缺少 Skill 目录' });
        return;
      }
      try {
        const prepared = await prepareAssist(dataDir, skillPath);
        sendJson(res, 200, { ok: true, ...prepared });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: describe(error) });
      }
      return;
    }

    if (route === '/resource/add') {
      const id = text(body.id);
      const state = await store.read();
      const action = state.actions.find((entry) => entry.id === id);
      if (action === undefined) {
        sendJson(res, 404, { ok: false, error: 'Action 不存在' });
        return;
      }
      let buffer;
      try {
        buffer = Buffer.from(typeof body.contentBase64 === 'string' ? body.contentBase64 : '', 'base64');
      } catch {
        sendJson(res, 400, { ok: false, error: '文件内容不是合法的 base64' });
        return;
      }
      let resources;
      try {
        resources = await addResourceFile(
          resourceDir(dataDir, id),
          typeof body.name === 'string' ? body.name : '',
          buffer,
          action.resources,
        );
      } catch (error) {
        sendJson(res, 400, { ok: false, error: describe(error) });
        return;
      }
      const { state: next } = await store.mutate((draft) => {
        draft.actions = draft.actions.map((entry) => (entry.id === id ? { ...entry, resources, updatedAt: Date.now() } : entry));
      });
      sendJson(res, 200, { ok: true, resources, actions: sortActions(next.actions) });
      return;
    }

    if (route === '/resource/delete') {
      const id = text(body.id);
      const state = await store.read();
      const action = state.actions.find((entry) => entry.id === id);
      if (action === undefined) {
        sendJson(res, 404, { ok: false, error: 'Action 不存在' });
        return;
      }
      let resources;
      try {
        resources = await deleteResourceFile(resourceDir(dataDir, id), body.name, action.resources);
      } catch (error) {
        sendJson(res, 400, { ok: false, error: describe(error) });
        return;
      }
      const { state: next } = await store.mutate((draft) => {
        draft.actions = draft.actions.map((entry) => (entry.id === id ? { ...entry, resources, updatedAt: Date.now() } : entry));
      });
      sendJson(res, 200, { ok: true, resources, actions: sortActions(next.actions) });
      return;
    }

    if (route === '/create') {
      const action = normalizeAction(body.action ?? body);
      const invalid = validateAction(action);
      if (!invalid.ok) {
        sendJson(res, 400, { ok: false, error: invalid.message, code: invalid.code });
        return;
      }
      const { state } = await store.mutate((draft) => {
        if (draft.actions.some((entry) => entry.id === action.id)) {
          action.id = `${action.id}-${Math.random().toString(16).slice(2, 6)}`;
        }
        draft.actions = [...draft.actions, action];
      });
      sendJson(res, 200, { ok: true, action, actions: sortActions(state.actions) });
      return;
    }

    if (route === '/update') {
      const id = text(body.id);
      const patch = body.patch !== null && typeof body.patch === 'object' ? body.patch : body.action;
      if (id === '' || patch === null || typeof patch !== 'object') {
        sendJson(res, 400, { ok: false, error: '缺少 id 或 patch' });
        return;
      }
      const { state, result } = await store.mutate((draft) => {
        const index = draft.actions.findIndex((entry) => entry.id === id);
        if (index < 0) return { missing: true };
        const previous = draft.actions[index];
        const next = normalizeAction({ ...previous, ...patch }, { id, previous });
        const invalid = validateAction(next);
        if (!invalid.ok) return { invalid };
        draft.actions = draft.actions.map((entry, at) => (at === index ? next : entry));
        return { action: next };
      });
      if (result?.missing) {
        sendJson(res, 404, { ok: false, error: 'Action 不存在' });
        return;
      }
      if (result?.invalid) {
        sendJson(res, 400, { ok: false, error: result.invalid.message, code: result.invalid.code });
        return;
      }
      sendJson(res, 200, { ok: true, action: result.action, actions: sortActions(state.actions) });
      return;
    }

    if (route === '/delete') {
      const id = text(body.id);
      const { state, result } = await store.mutate((draft) => {
        const before = draft.actions.length;
        draft.actions = draft.actions.filter((entry) => entry.id !== id);
        return { removed: before - draft.actions.length };
      });
      if (result.removed > 0) await removeResources(resourceDir(dataDir, id));
      sendJson(res, 200, { ok: true, removed: result.removed, actions: sortActions(state.actions) });
      return;
    }

    if (route === '/duplicate') {
      const id = text(body.id);
      const { state, result } = await store.mutate((draft) => {
        const source = draft.actions.find((entry) => entry.id === id);
        if (source === undefined) return { missing: true };
        const copy = normalizeAction(
          {
            ...source,
            name: `${source.name} 副本`,
            usage: { count: 0, lastAt: 0 },
            source: source.source,
          },
          { now: Date.now() },
        );
        draft.actions = [...draft.actions, copy];
        return { action: copy };
      });
      if (result?.missing) {
        sendJson(res, 404, { ok: false, error: 'Action 不存在' });
        return;
      }
      await copyResources(resourceDir(dataDir, id), resourceDir(dataDir, result.action.id));
      sendJson(res, 200, { ok: true, action: result.action, actions: sortActions(state.actions) });
      return;
    }

    if (route === '/touch') {
      const id = text(body.id);
      const { result } = await store.mutate((draft) => {
        const index = draft.actions.findIndex((entry) => entry.id === id);
        if (index < 0) return { missing: true };
        const previous = draft.actions[index];
        const next = {
          ...previous,
          usage: {
            count: (previous.usage?.count ?? 0) + 1,
            lastAt: Date.now(),
          },
        };
        draft.actions = draft.actions.map((entry, at) => (at === index ? next : entry));
        return { action: next };
      });
      sendJson(res, 200, { ok: true, missing: Boolean(result?.missing) });
      return;
    }

    if (route === '/import') {
      const raw = body.actions ?? body.action ?? body.import ?? body;
      const list = Array.isArray(raw)
        ? raw
        : raw !== null && typeof raw === 'object' && Array.isArray(raw.actions) ? raw.actions : null;
      if (list === null) {
        sendJson(res, 400, { ok: false, error: '导入内容必须包含 actions 数组' });
        return;
      }
      const mode = body.mode === 'replace' ? 'replace' : 'merge';
      const written = new Map();
      for (const entry of list) {
        if (entry === null || typeof entry !== 'object' || !Array.isArray(entry.resources)) continue;
        const normalized = normalizeAction(entry);
        written.set(normalized.id, await writeResourceEntries(resourceDir(dataDir, normalized.id), entry.resources));
      }
      const { state, result } = await store.mutate((draft) => {
        const merged = mergeActions(draft.actions, list, mode);
        draft.actions = merged.actions;
        return merged;
      });
      if (written.size > 0) {
        await store.mutate((draft) => {
          draft.actions = draft.actions.map((entry) => (written.has(entry.id)
            ? { ...entry, resources: written.get(entry.id) }
            : entry));
        });
      }
      sendJson(res, 200, {
        ok: true,
        mode,
        added: result.added,
        updated: result.updated,
        actions: sortActions((await store.read()).actions),
      });
      return;
    }

    if (route === '/import-skill') {
      const explicitPath = text(body.path);
      /** @type {{ name: string, description: string, content: string, path?: string }} */
      let definition;
      if (explicitPath !== '') {
        const candidate = nodePath.resolve(explicitPath);
        let stat;
        try {
          stat = await fs.stat(candidate);
        } catch {
          sendJson(res, 404, { ok: false, error: `目录不存在：${explicitPath}` });
          return;
        }
        const skillPath = stat.isDirectory() ? nodePath.join(candidate, 'SKILL.md') : candidate;
        let raw;
        try {
          raw = await fs.readFile(skillPath, 'utf8');
        } catch {
          sendJson(res, 404, { ok: false, error: `没有找到 SKILL.md：${skillPath}` });
          return;
        }
        const parsed = parseSkillMarkdown(raw);
        const folder = stat.isDirectory() ? candidate : nodePath.dirname(skillPath);
        definition = {
          name: parsed.meta.name || nodePath.basename(folder),
          description: parsed.meta.description || '',
          content: parsed.body,
          path: skillPath,
        };
      } else {
        const skills = ctx.get('skills');
        if (skills === undefined) {
          sendJson(res, 400, { ok: false, error: '当前 Profile 未启用 Skills 服务' });
          return;
        }
        const skillName = text(body.name);
        if (skillName === '') {
          sendJson(res, 400, { ok: false, error: '缺少 skill 名称或目录' });
          return;
        }
        const cwd = await resolveCwd(ctx, text(body.cwd));
        const found = await skills.get(skillName, { cwd });
        if (found === undefined) {
          sendJson(res, 404, { ok: false, error: `没有找到 skill：${skillName}` });
          return;
        }
        definition = found;
      }
      const action = normalizeAction({
        name: definition.name,
        description: definition.description,
        category: text(body.category) || IMPORT_CATEGORY,
        tags: ['skill'],
        prompt: String(definition.content ?? ''),
        source: { kind: 'skill', name: definition.name, detail: definition.path },
      });
      const copied = await copySkillResources(definition.path, resourceDir(dataDir, action.id));
      if (copied.resources.length > 0) action.resources = copied.resources;
      const { state } = await store.mutate((draft) => {
        draft.actions = [...draft.actions, action];
      });
      sendJson(res, 200, {
        ok: true,
        action,
        resources: copied.resources.length,
        skipped: copied.skipped,
        actions: sortActions(state.actions),
      });
      return;
    }

    if (route === '/category/rename') {
      const from = text(body.from);
      const to = text(body.to).slice(0, 40);
      const { state, result } = await store.mutate((draft) => {
        let changed = 0;
        draft.actions = draft.actions.map((entry) => {
          if ((entry.category || '') !== from) return entry;
          changed += 1;
          return { ...entry, category: to, updatedAt: Date.now() };
        });
        return { changed };
      });
      sendJson(res, 200, { ok: true, changed: result.changed, actions: sortActions(state.actions) });
      return;
    }

    if (route === '/category/delete') {
      const target = text(body.name);
      const { state, result } = await store.mutate((draft) => {
        let changed = 0;
        draft.actions = draft.actions.map((entry) => {
          if ((entry.category || '') !== target) return entry;
          changed += 1;
          return { ...entry, category: '', updatedAt: Date.now() };
        });
        return { changed };
      });
      sendJson(res, 200, { ok: true, changed: result.changed, actions: sortActions(state.actions) });
      return;
    }

    sendJson(res, 404, { ok: false, error: `未知操作：${route}` });
  } catch (error) {
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: describe(error) });
  }
}

/**
 * Reject a cross-site request while accepting the same-origin page (and a
 * programmatic local call that sends no Origin at all).
 *
 * @param {object} ctx
 * @param {import('node:http').IncomingMessage} req
 * @returns {boolean}
 */
function originAllowed(ctx, req) {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || origin === '') return true;
  try {
    const self = ctx.webServer.getOrigin();
    if (typeof self === 'string' && self !== '') {
      return origin.replace(/\/+$/, '') === self.replace(/\/+$/, '');
    }
  } catch {
    /* fall through to the Host-header comparison */
  }
  const host = req.headers.host;
  try {
    return host !== undefined && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Shorten a path under the user's home directory for display, so a settings
 * page (and its screenshots) does not have to expose the account name.
 *
 * @param {string} filePath
 * @returns {string}
 */
function displayPath(filePath) {
  try {
    const home = os.homedir();
    if (typeof filePath === 'string' && home !== '' && filePath.startsWith(home)) {
      return `~${filePath.slice(home.length)}`;
    }
  } catch {
    /* keep the absolute path when the home directory is unavailable */
  }
  return filePath;
}

/**
 * Resolve a directory skill list should scan: the explicit request value first,
 * then the profile's default working directory.
 *
 * @param {object} ctx
 * @param {string} requested
 * @returns {Promise<string | undefined>}
 */
async function resolveCwd(ctx, requested) {
  if (typeof requested === 'string' && requested.trim() !== '') return requested.trim();
  const workingDirectory = ctx.get('workingDirectory');
  if (workingDirectory !== undefined) {
    try {
      const value = workingDirectory.defaultDirectory;
      if (typeof value === 'string' && value !== '') return value;
    } catch {
      /* no default directory available */
    }
    try {
      const agents = ctx.get('agents');
      const list = agents?.list?.() ?? [];
      for (const agent of list) {
        const value = await workingDirectory.get?.(agent.session ?? agent);
        if (typeof value === 'string' && value !== '') return value;
      }
    } catch {
      /* session lookup is best-effort */
    }
  }
  return undefined;
}

/**
 * Parse a SKILL.md document into its frontmatter map and body.
 *
 * @param {string} content
 * @returns {{ meta: Record<string, string>, body: string }}
 */
function parseSkillMarkdown(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u.exec(content);
  if (match === null) return { meta: {}, body: content.trim() };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at <= 0) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key !== '') meta[key] = value;
  }
  return { meta, body: content.slice(match[0].length).trim() };
}

/**
 * The exported shape of one Action: identity and content, without per-machine
 * usage counters that would churn a shared file.
 *
 * @param {object} action
 * @returns {object}
 */
function exportable(action) {
  return {
    id: action.id,
    name: action.name,
    description: action.description,
    category: action.category,
    tags: action.tags,
    prompt: action.prompt,
    argsHint: action.argsHint,
    pinned: action.pinned === true,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
    ...(action.source ? { source: action.source } : {}),
  };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Read and parse a JSON request body with a hard size cap.
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<unknown | undefined>}
 */
async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error(`请求体超过 ${Math.round(MAX_BODY / 1024 / 1024)} MB`);
    chunks.push(chunk);
  }
  if (chunks.length === 0) return undefined;
  const textBody = Buffer.concat(chunks).toString('utf8').trim();
  if (textBody === '') return undefined;
  try {
    return JSON.parse(textBody);
  } catch {
    return undefined;
  }
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} value
 */
function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-length', Buffer.byteLength(body));
  res.end(body);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

/** Exported for the Host-side test suite. */
export const internals = {
  ROUTE,
  originAllowed,
  exportable,
  expandPrompt,
  MAX_PROMPT,
  planActionRefs,
  referencedActions,
  actionInvocationMessage,
};
