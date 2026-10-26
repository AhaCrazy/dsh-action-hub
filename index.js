/**
 * dsh-action-hub — Host half.
 *
 * Standard `SKILL.md` directories are the only artifact. Plugin-only state
 * (mode, scope, category, pin, usage) lives in `state.json` outside them.
 *
 * @module dsh-action-hub
 */
import path from 'node:path';

import { installActionInvocations } from './host/invoke.js';
import { actionInvocationMessage, planActionRefs, referencedActions } from './host/refs.js';
export { actionInvocationMessage, planActionRefs, referencedActions } from './host/refs.js';
import { actionResourceDir, getBuiltins, isBuiltinId, readAll } from './host/state.js';
import { installSkillsProvider, notifySkillCatalog } from './host/skills-provider.js';
import { listProjects, findCurrentProject } from './host/projects.js';
import { resolveProjectRoot } from './host/scope.js';
import { actionAvailable, profileFor } from './host/availability.js';
import {
  applyFolderPlan,
  applyZipPlan,
  exportZipBuffer,
  previewFolder,
  previewZipBuffer,
} from './bundle.js';
import { exportResourceFiles, readResourcePreviews } from './resources.js';
import {
  MAX_PROMPT,
  createStore,
  defaultDataDir,
  expandPrompt,
  normalizeAction,
  sortActions,
  validateAction,
} from './store.js';

export const name = 'action-hub';
export const inject = ['webServer'];

const ROUTE = '/api/dsh-action-hub';
const MAX_BODY = 40 * 1024 * 1024;

export function apply(ctx, config = {}) {
  const dataDir = typeof config.dataDir === 'string' && config.dataDir.trim() !== ''
    ? config.dataDir.trim()
    : defaultDataDir();
  const store = createStore({ dataDir });
  ctx.effect(() => installActionInvocations(ctx, store), 'action-hub: command invocations');
  installSkillsProvider(ctx, store);

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: (req, res) => handle(ctx, store, dataDir, req, res),
  }), 'action-hub: API route');
}

async function handle(ctx, store, dataDir, req, res) {
  if (!originAllowed(ctx, req)) {
    sendJson(res, 403, { ok: false, error: '跨站请求被拒绝' });
    return;
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const route = url.pathname.slice(ROUTE.length).replace(/\/+$/, '') || '/';
  const method = req.method ?? 'GET';

  try {
    if (method === 'GET' && route === '/state') {
      const view = await readAll(store);
      const { state, actions, invalid } = view;
      const plan = planActionRefs(actions);
      const projects = await listProjects(ctx);
      const currentProject = await findCurrentProject(ctx, projects, url.searchParams.get('sessionId') ?? '');
      const currentRoot = currentProject === null ? null : await resolveProjectRoot(currentProject.path, projects);
      const currentProfile = profileFor(view.projects, currentRoot, view.defaultGroup);
      sendJson(res, 200, {
        ok: true,
        version: state.version,
        actions: sortActions(actions).map((action) => ({ ...action, available: actionAvailable(action, currentProfile, view.groups) })),
        projects,
        projectScopes: view.projects,
        groups: state.state.groups,
        defaultGroup: view.defaultGroup,
        currentProject,
        currentProfile,
        invalid,
        meta: {
          dataFile: store.filePath(),
          dataFileDisplay: displayPath(store.filePath()),
          libraryDisplay: displayPath(store.libraryDir()),
          referencing: true,
          handles: Object.fromEntries(plan.handles),
        },
      });
      return;
    }

    if (method === 'GET' && route === '/resources') {
      const id = url.searchParams.get('id') ?? '';
      const { actions } = await readAll(store);
      const action = actions.find((entry) => entry.id === id);
      if (action === undefined) {
        sendJson(res, 404, { ok: false, error: '技能不存在' });
        return;
      }
      const files = await readResourcePreviews(actionResourceDir(action), action.resources);
      sendJson(res, 200, { ok: true, files });
      return;
    }

    if (method === 'GET' && route === '/bundle/zip') {
      const requested = url.searchParams.getAll('id');
      const grouped = (url.searchParams.get('ids') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
      const selection = [...requested, ...grouped];
      const data = await exportZipBuffer(store, dataDir, selection.length > 0 ? selection : undefined);
      sendBytes(res, 200, data.buffer, 'application/zip', data.filename);
      return;
    }

    if (method === 'GET' && route === '/export') {
      const { actions } = await readAll(store);
      sendJson(res, 200, {
        ok: true,
        exportedAt: new Date().toISOString(),
        plugin: 'dsh-action-hub',
        format: 'dsh-action-hub/standard-skills@1',
        actions: sortActions(actions).map((action) => ({
          name: action.name,
          description: action.description,
          body: action.prompt,
          resources: action.resources,
        })),
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
      const preview = await previewFolder(store, dataDir, text(body.path));
      sendJson(res, 200, { ok: true, kind: 'folder', path: text(body.path), ...preview });
      return;
    }

    if (route === '/bundle/import-folder') {
      const reserved = (await getBuiltins()).map((action) => action.name);
      const imported = await applyFolderPlan(store, dataDir, text(body.path), Array.isArray(body.decisions) ? body.decisions : [], reserved);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ...imported, ok: true, actions: sortActions((await readAll(store)).actions) });
      return;
    }

    if (route === '/bundle/preview-zip') {
      const buffer = Buffer.from(typeof body.contentBase64 === 'string' ? body.contentBase64 : '', 'base64');
      if (buffer.length === 0) throw new Error('ZIP 内容为空');
      const preview = await previewZipBuffer(store, dataDir, buffer);
      sendJson(res, 200, { ok: true, kind: 'zip', contentBase64: body.contentBase64, ...preview });
      return;
    }

    if (route === '/bundle/import-zip') {
      const buffer = Buffer.from(typeof body.contentBase64 === 'string' ? body.contentBase64 : '', 'base64');
      if (buffer.length === 0) throw new Error('ZIP 内容为空');
      const reserved = (await getBuiltins()).map((action) => action.name);
      const imported = await applyZipPlan(store, dataDir, buffer, Array.isArray(body.decisions) ? body.decisions : [], reserved);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ...imported, ok: true, actions: sortActions((await readAll(store)).actions) });
      return;
    }

    if (route === '/create') {
      const action = normalizeAction(body.action ?? body);
      const invalid = validateAction(action);
      if (!invalid.ok) {
        sendJson(res, 400, { ok: false, error: invalid.message, code: invalid.code });
        return;
      }
      if (await isBuiltinId(action.name)) {
        sendJson(res, 403, { ok: false, error: '内置技能不能被覆盖' });
        return;
      }
      const created = await store.create(action);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, action: created });
      return;
    }

    if (route === '/update') {
      const id = text(body.id);
      const patch = body.patch !== null && typeof body.patch === 'object' ? body.patch : body.action ?? {};
      if (await isBuiltinId(id)) {
        sendJson(res, 403, { ok: false, error: '内置技能只读，复制后才能修改' });
        return;
      }
      const updated = await store.update(id, normalizeAction({ ...patch, name: patch.name ?? id }));
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, action: updated });
      return;
    }

    if (route === '/delete') {
      const id = text(body.id);
      if (await isBuiltinId(id)) {
        sendJson(res, 403, { ok: false, error: '内置技能只读，不能删除' });
        return;
      }
      await store.remove(id);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (route === '/touch') {
      await store.touch(text(body.id));
      sendJson(res, 200, { ok: true });
      return;
    }

    if (route === '/action/groups') {
      const entry = await store.setActionGroups(text(body.id), body.groups);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, groups: entry.groups });
      return;
    }

    if (route === '/groups/includes') {
      const group = await store.setGroupIncludes(text(body.id), body.includes);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, group });
      return;
    }

    if (route === '/groups/actions') {
      const builtins = await getBuiltins();
      const result = await store.setGroupActions(
        text(body.id),
        body.actions,
        builtins.map((action) => action.name),
      );
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    if (route === '/project-scope') {
      const profile = await store.setProjectScope(text(body.path), body);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, profile });
      return;
    }

    if (route === '/groups/create') {
      const group = await store.createGroup(text(body.name));
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, group });
      return;
    }

    if (route === '/groups/rename') {
      const group = await store.renameGroup(text(body.id), text(body.name));
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, group });
      return;
    }

    if (route === '/groups/default') {
      const group = await store.setDefaultGroup(text(body.id));
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, group });
      return;
    }

    if (route === '/groups/global') {
      const group = await store.setGroupGlobal(text(body.id), body.global === true);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, group });
      return;
    }

    if (route === '/groups/delete') {
      const groups = await store.deleteGroup(text(body.id));
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, groups });
      return;
    }

    if (route === '/mode') {
      const entry = await store.setMode(text(body.id), body.mode);
      notifySkillCatalog(ctx);
      sendJson(res, 200, { ok: true, mode: entry.mode });
      return;
    }

    if (route === '/category/rename') {
      const changed = await store.renameCategory(text(body.from), text(body.to));
      sendJson(res, 200, { ok: true, changed });
      return;
    }

    if (route === '/category/delete') {
      const changed = await store.deleteCategory(text(body.name));
      sendJson(res, 200, { ok: true, changed });
      return;
    }

    sendJson(res, 404, { ok: false, error: `未知接口：${route}` });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: describe(error) });
  }
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function displayPath(file) {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return home !== '' && file.startsWith(home) ? `~${file.slice(home.length)}` : file;
}

function originAllowed(ctx, req) {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || origin === '') return true;
  let expected;
  try {
    expected = ctx.webServer.getOrigin();
  } catch {
    expected = undefined;
  }
  if (typeof expected === 'string' && expected !== '') {
    try {
      return new URL(origin).origin === new URL(expected).origin;
    } catch {
      return false;
    }
  }
  const host = req.headers.host;
  try {
    return typeof host === 'string' && new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readJsonBody(req) {
  const length = Number(req.headers['content-length'] ?? '0');
  if (Number.isFinite(length) && length > MAX_BODY) throw new Error('请求体过大');
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function sendBytes(res, status, buffer, contentType, filename) {
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': buffer.length,
    'content-disposition': `attachment; filename="${filename.replace(/["\\]/gu, '')}"`,
  });
  res.end(buffer);
}

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

/** Exported for the Host-side test suite. */
export const internals = {
  ROUTE,
  originAllowed,
  expandPrompt,
  MAX_PROMPT,
  planActionRefs,
  referencedActions,
  actionInvocationMessage,
};
