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
import os from 'node:os';
import path from 'node:path';

import { updateBuiltinState } from './builtin-state.js';
import { installActionInvocations } from './host/invoke.js';
import { actionInvocationMessage, planActionRefs, referencedActions } from './host/refs.js';
export { actionInvocationMessage, planActionRefs, referencedActions } from './host/refs.js';
import { actionResourceDir, cleanupLegacyBuiltins, getBuiltins, isBuiltinId, readAll } from './host/state.js';
import {
  applyFolderPlan,
  applyZipPlan,
  exportZipBuffer,
  previewFolder,
  previewZipBuffer,
} from './bundle.js';
import {
  exportResourceFiles,
  readResourcePreviews,
  removeActionDir,
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
  void cleanupLegacyBuiltins(store, dataDir).catch((error) => {
    ctx.logger?.warn?.(`dsh-action-hub: could not clean up legacy built-in Actions: ${describe(error)}`);
  });
  ctx.effect(() => installActionInvocations(ctx, store, dataDir), 'action-hub: action invocations');

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: (req, res) => handle(ctx, store, dataDir, req, res),
  }), 'action-hub: API route');
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
      const { state, actions } = await readAll(store, dataDir);
      const plan = planActionRefs(actions);
      sendJson(res, 200, {
        ok: true,
        version: state.version,
        actions,
        meta: {
          dataFile: store.filePath(),
          dataFileDisplay: displayPath(store.filePath()),
          referencing: true,
          handles: Object.fromEntries(plan.handles),
        },
      });
      return;
    }

    if (method === 'GET' && route === '/resources') {
      const id = url.searchParams.get('id') ?? '';
      const { actions } = await readAll(store, dataDir);
      const action = actions.find((entry) => entry.id === id);
      if (action === undefined) {
        sendJson(res, 404, { ok: false, error: 'Action 不存在' });
        return;
      }
      const files = await readResourcePreviews(actionResourceDir(action, dataDir), action.resources);
      sendJson(res, 200, { ok: true, files });
      return;
    }

    if (method === 'GET' && route === '/bundle/zip') {
      try {
        const requested = url.searchParams.getAll('id');
        const grouped = (url.searchParams.get('ids') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
        const selection = [...requested, ...grouped];
        const data = await exportZipBuffer(store, dataDir, selection.length > 0 ? selection : undefined);
        sendBytes(res, 200, data.buffer, 'application/zip', data.filename);
      } catch (error) {
        sendJson(res, 404, { ok: false, error: describe(error) });
      }
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

    if (route === '/bundle/preview-folder') {
      try {
        const preview = await previewFolder(store, dataDir, text(body.path));
        sendJson(res, 200, { ok: true, ...preview });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: describe(error) });
      }
      return;
    }

    if (route === '/bundle/import-folder') {
      try {
        const imported = await applyFolderPlan(store, dataDir, text(body.path), Array.isArray(body.decisions) ? body.decisions : [], (await getBuiltins()).map((action) => action.id));
        const state = await store.read();
        sendJson(res, 200, { ...imported, ok: true, actions: (await readAll(store, dataDir)).actions });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: describe(error) });
      }
      return;
    }

    if (route === '/bundle/preview-zip') {
      try {
        const buffer = Buffer.from(typeof body.contentBase64 === 'string' ? body.contentBase64 : '', 'base64');
        if (buffer.length === 0) throw new Error('ZIP 内容为空');
        const preview = await previewZipBuffer(store, dataDir, buffer);
        sendJson(res, 200, { ok: true, ...preview });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: describe(error) });
      }
      return;
    }

    if (route === '/bundle/import-zip') {
      try {
        const buffer = Buffer.from(typeof body.contentBase64 === 'string' ? body.contentBase64 : '', 'base64');
        if (buffer.length === 0) throw new Error('ZIP 内容为空');
        const imported = await applyZipPlan(store, dataDir, buffer, Array.isArray(body.decisions) ? body.decisions : [], (await getBuiltins()).map((action) => action.id));
        const state = await store.read();
        sendJson(res, 200, { ...imported, ok: true, actions: (await readAll(store, dataDir)).actions });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: describe(error) });
      }
      return;
    }

    if (route === '/create') {
      const action = normalizeAction(body.action ?? body);
      const invalid = validateAction(action);
      if (!invalid.ok) {
        sendJson(res, 400, { ok: false, error: invalid.message, code: invalid.code });
        return;
      }
      if (await isBuiltinId(action.id)) {
        sendJson(res, 403, { ok: false, error: '内置 Action 不能被覆盖' });
        return;
      }
      await store.mutate((draft) => {
        if (draft.actions.some((entry) => entry.id === action.id)) {
          action.id = `${action.id}-${Math.random().toString(16).slice(2, 6)}`;
        }
        draft.actions = [...draft.actions, action];
      });
      sendJson(res, 200, { ok: true, action, actions: (await readAll(store, dataDir)).actions });
      return;
    }

    if (route === '/update') {
      const id = text(body.id);
      const patch = body.patch !== null && typeof body.patch === 'object' ? body.patch : body.action;
      if (id === '' || patch === null || typeof patch !== 'object') {
        sendJson(res, 400, { ok: false, error: '缺少 id 或 patch' });
        return;
      }
      if (await isBuiltinId(id)) {
        const keys = Object.keys(patch);
        if (keys.some((key) => key !== 'pinned')) {
          sendJson(res, 403, { ok: false, error: '内置 Action 只允许修改置顶状态' });
          return;
        }
        if (typeof patch.pinned !== 'boolean') {
          sendJson(res, 400, { ok: false, error: 'pinned 必须是布尔值' });
          return;
        }
        await updateBuiltinState(dataDir, (state) => ({
          ...state,
          pinned: { ...state.pinned, [id]: patch.pinned },
        }));
        const { actions } = await readAll(store, dataDir);
        sendJson(res, 200, { ok: true, action: actions.find((entry) => entry.id === id), actions });
        return;
      }
      const { result } = await store.mutate((draft) => {
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
      sendJson(res, 200, { ok: true, action: result.action, actions: (await readAll(store, dataDir)).actions });
      return;
    }

    if (route === '/delete') {
      const id = text(body.id);
      if (await isBuiltinId(id)) {
        sendJson(res, 403, { ok: false, error: '内置 Action 由插件管理，不能删除' });
        return;
      }
      const { result } = await store.mutate((draft) => {
        const before = draft.actions.length;
        draft.actions = draft.actions.filter((entry) => entry.id !== id);
        return { removed: before - draft.actions.length };
      });
      if (result.removed > 0) await removeActionDir(dataDir, id);
      sendJson(res, 200, { ok: true, removed: result.removed, actions: (await readAll(store, dataDir)).actions });
      return;
    }

    if (route === '/touch') {
      const id = text(body.id);
      if (await isBuiltinId(id)) {
        await updateBuiltinState(dataDir, (state) => ({
          ...state,
          usage: { ...state.usage, [id]: bumpUsage(state.usage[id]) },
        }));
        sendJson(res, 200, { ok: true, missing: false });
        return;
      }
      const { result } = await store.mutate((draft) => {
        const index = draft.actions.findIndex((entry) => entry.id === id);
        if (index < 0) return { missing: true };
        const previous = draft.actions[index];
        const next = {
          ...previous,
          usage: bumpUsage(previous.usage),
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
      const reserved = new Set((await getBuiltins()).map((action) => action.id));
      const accepted = list.filter((entry) => {
        if (entry === null || typeof entry !== 'object') return false;
        try {
          return !reserved.has(normalizeAction(entry).id);
        } catch {
          return false;
        }
      });
      const written = new Map();
      for (const entry of accepted) {
        if (!Array.isArray(entry.resources)) continue;
        const normalized = normalizeAction(entry);
        written.set(normalized.id, await writeResourceEntries(resourceDir(dataDir, normalized.id), entry.resources));
      }
      const { result } = await store.mutate((draft) => {
        const merged = mergeActions(draft.actions, accepted, mode);
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
        actions: (await readAll(store, dataDir)).actions,
      });
      return;
    }

    if (route === '/import-skill') {
      sendJson(res, 410, { ok: false, error: '按名称导入 Skill 已移除；请用默认的「Action 导入助手」或导入 Action 包。' });
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
      sendJson(res, 200, { ok: true, changed: result.changed, actions: (await readAll(store, dataDir)).actions });
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
      sendJson(res, 200, { ok: true, changed: result.changed, actions: (await readAll(store, dataDir)).actions });
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
 * Send a binary download.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {Buffer} body
 * @param {string} mediaType
 * @param {string} filename
 */
function sendBytes(res, status, body, mediaType, filename) {
  res.statusCode = status;
  res.setHeader('content-type', mediaType);
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('content-length', body.length);
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
