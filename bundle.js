/**
 * dsh-action-hub — standard Agent Skill import/export bundles.
 *
 * A bundle is one or more standard skill directories (`SKILL.md` + resources).
 * No private manifest is required; the document itself is the format.
 *
 * @module dsh-action-hub/bundle
 */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { listFiles, readSkillDir, SKILL_FILE } from './skill-doc.js';
import { describeError } from './skill-doc.js';
import { createZip, readZip } from './zip.js';
import { safeRelativeName } from './resources.js';

export async function exportZipBuffer(store, dataDir, selection = undefined) {
  const { actions } = await store.read();
  const ids = selection === undefined ? null : typeof selection === 'string' ? [selection] : [...selection];
  const selected = ids === null ? actions : actions.filter((entry) => ids.includes(entry.id));
  if (selected.length === 0) throw new Error('没有可导出的技能');
  const entries = [];
  for (const action of selected) {
    const folder = action.name;
    for (const relative of [SKILL_FILE, ...await listFiles(action.dir)]) {
      entries.push({ name: `${folder}/${relative}`, data: await fs.readFile(path.join(action.dir, relative)) });
    }
  }
  const filename = ids === null
    ? 'dsh-action-hub.zip'
    : ids.length === 1 ? `${selected[0].name}.zip` : 'dsh-action-hub-selection.zip';
  return { buffer: createZip(entries), count: selected.length, filename };
}

async function collectFolderSkills(root) {
  const direct = await readSkillDir(root);
  if (direct.error === '') return [direct];
  if (direct.error !== '缺少 SKILL.md') throw new Error(`SKILL.md 无效：${direct.error}`);
  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    throw new Error('目录不存在');
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const child = await readSkillDir(path.join(root, entry.name));
    if (child.error === '') out.push(child);
  }
  if (out.length === 0) throw new Error('目录里没有包含有效 SKILL.md 的标准技能');
  return out;
}

function planItem(candidate, existing, key, allNames) {
  const duplicateName = allNames.get(candidate.name) > 1;
  let status = 'new';
  let defaultMode = 'create-command';
  let modes = ['create-command', 'create-skill', 'skip'];
  if (duplicateName) {
    status = 'conflict';
    defaultMode = 'skip';
    modes = ['skip', 'create', 'update'];
  } else if (existing !== undefined) {
    if (existing.fingerprint === candidate.fingerprint) {
      status = 'duplicate';
      defaultMode = 'skip';
      modes = ['skip', 'create'];
    } else {
      status = 'update';
      defaultMode = 'update';
      modes = ['update', 'skip', 'create'];
    }
  }
  return {
    key,
    name: candidate.name,
    description: candidate.description,
    category: existing?.category ?? '',
    status,
    defaultMode,
    modes,
    target: existing === undefined ? null : { id: existing.id, name: existing.name },
    duplicateOf: null,
    fingerprint: candidate.fingerprint,
    resources: candidate.files.map((name) => ({ name })),
    sourceDir: candidate.dir,
  };
}

function buildPlan(store, candidates, sourceLabel) {
  return (async () => {
    const { actions } = await store.read();
    const byName = new Map(actions.map((action) => [action.name, action]));
    const names = new Map();
    for (const candidate of candidates) names.set(candidate.name, (names.get(candidate.name) ?? 0) + 1);
    const seen = new Map();
    const items = candidates.map((candidate) => {
      const count = (seen.get(candidate.name) ?? 0) + 1;
      seen.set(candidate.name, count);
      const key = count === 1 ? candidate.name : `${candidate.name}#${count}`;
      return planItem(candidate, byName.get(candidate.name), key, names);
    });
    const summary = { total: items.length, new: 0, duplicate: 0, update: 0, conflict: 0 };
    for (const item of items) summary[item.status] += 1;
    return { sourceLabel, summary, items };
  })();
}

export async function previewFolder(store, dataDir, source) {
  const root = path.resolve(String(source));
  const candidates = await collectFolderSkills(root);
  return buildPlan(store, candidates, root);
}

export async function previewZipBuffer(store, dataDir, buffer) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-action-hub-'));
  try {
    const entries = readZip(buffer);
    for (const [entryName, data] of entries) {
      const relative = safeRelativeName(entryName);
      if (relative === '') continue;
      const target = path.join(temporary, ...relative.split('/'));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, data);
    }
    const candidates = await collectFolderSkills(temporary);
    return await buildPlan(store, candidates, 'ZIP');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
  }
}

async function copySkill(source, target) {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
  await fs.cp(source, target, { recursive: true, force: true });
}

async function applyPlan(store, dataDir, candidates, decisions, reserved) {
  const decisionMap = new Map((Array.isArray(decisions) ? decisions : []).map((item) => [item.key, item.mode]));
  const { actions } = await store.read();
  const byName = new Map(actions.map((action) => [action.name, action]));
  const names = new Map();
  for (const candidate of candidates) names.set(candidate.name, (names.get(candidate.name) ?? 0) + 1);
  const seen = new Map();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let conflicts = 0;
  for (const candidate of candidates) {
    const count = (seen.get(candidate.name) ?? 0) + 1;
    seen.set(candidate.name, count);
    const key = count === 1 ? candidate.name : `${candidate.name}#${count}`;
    const mode = decisionMap.get(key);
    if (mode === undefined || mode === 'skip') { skipped += 1; continue; }
    if (reserved.has(candidate.name) || (names.get(candidate.name) ?? 0) > 1) { conflicts += 1; continue; }
    const existing = byName.get(candidate.name);
    const creating = mode === 'create' || mode === 'create-command' || mode === 'create-skill';
    const createAsSkill = mode === 'create-skill';
    if (creating && existing !== undefined) { skipped += 1; continue; }
    const target = path.join(dataDir, 'library', candidate.name);
    try {
      await copySkill(candidate.dir, target);
      const body = (await readSkillDir(target)).body;
      await store.update(candidate.name, {
        description: candidate.description,
        prompt: body,
        ...(existing === undefined ? { mode: createAsSkill ? 'skill' : 'command' } : {}),
      });
      if (existing === undefined) imported += 1; else updated += 1;
    } catch (error) {
      conflicts += 1;
      if (existing === undefined) await fs.rm(target, { recursive: true, force: true }).catch(() => {});
    }
  }
  return { imported, updated, skipped, duplicated: 0, conflicts };
}

export async function applyFolderPlan(store, dataDir, source, decisions, reservedIds = []) {
  const root = path.resolve(String(source));
  const candidates = await collectFolderSkills(root);
  return applyPlan(store, dataDir, candidates, decisions, new Set(reservedIds));
}

export async function applyZipPlan(store, dataDir, buffer, decisions, reservedIds = []) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-action-hub-'));
  try {
    const entries = readZip(buffer);
    for (const [entryName, data] of entries) {
      const relative = safeRelativeName(entryName);
      if (relative === '') continue;
      const target = path.join(temporary, ...relative.split('/'));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, data);
    }
    const candidates = await collectFolderSkills(temporary);
    const result = await applyPlan(store, dataDir, candidates, decisions, new Set(reservedIds));
    return result;
  } finally {
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => {});
  }
}

export { describeError };
