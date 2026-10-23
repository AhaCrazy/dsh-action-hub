import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createStore, normalizeScope } from '../store.js';

async function tempData() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dsh-action-hub-v6-'));
}

test('creates a standard SKILL.md and keeps plugin state outside it', async () => {
  const dataDir = await tempData();
  const store = createStore({ dataDir });
  const created = await store.create({
    name: 'code-review',
    description: 'Review changes',
    prompt: 'Please review the current diff.',
    category: 'dev',
    tags: ['review'],
    mode: 'command',
  });
  assert.equal(created.name, 'code-review');
  assert.equal(created.mode, 'command');
  const skill = await fs.readFile(path.join(dataDir, 'library', 'code-review', 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\n/u);
  assert.match(skill, /name: code-review/u);
  assert.match(skill, /description: Review changes/u);
  assert.equal(await fs.stat(path.join(dataDir, 'library', 'code-review', 'action.json')).catch(() => undefined), undefined);
  const state = JSON.parse(await fs.readFile(path.join(dataDir, 'state.json'), 'utf8'));
  assert.equal(state.entries['code-review'].mode, 'command');
  assert.equal(state.entries['code-review'].category, 'dev');
});

test('updates mode/groups/pin without rewriting the skill body', async () => {
  const dataDir = await tempData();
  const store = createStore({ dataDir });
  await store.create({ name: 'demo', description: 'Demo', prompt: 'Body text.', mode: 'command' });
  const before = await fs.readFile(path.join(dataDir, 'library', 'demo', 'SKILL.md'), 'utf8');
  await store.setMode('demo', 'skill');
  const group = await store.createGroup('AgilityDog');
  await store.setActionGroups('demo', ['common', group.id]);
  const after = await fs.readFile(path.join(dataDir, 'library', 'demo', 'SKILL.md'), 'utf8');
  assert.equal(after, before);
  const action = (await store.read()).actions[0];
  assert.equal(action.mode, 'skill');
  assert.deepEqual(action.groups, ['common', group.id]);
});

test('renames a skill directory and keeps the state key stable', async () => {
  const dataDir = await tempData();
  const store = createStore({ dataDir });
  await store.create({ name: 'old-name', description: 'Old', prompt: 'Old body.' });
  const group = await store.createGroup('AgilityDog');
  await store.setActionGroups('old-name', [group.id]);
  const updated = await store.update('old-name', { name: 'new-name', description: 'New', prompt: 'New body.' });
  assert.equal(updated.name, 'new-name');
  assert.equal(await fs.stat(path.join(dataDir, 'library', 'old-name')).catch(() => undefined), undefined);
  const action = (await store.read()).actions[0];
  assert.equal(action.name, 'new-name');
  assert.deepEqual(action.groups, [group.id]);
});

test('touch records week/month usage', async () => {
  const dataDir = await tempData();
  const store = createStore({ dataDir });
  await store.create({ name: 'usage-demo', description: 'Demo', prompt: 'Body.' });
  await store.touch('usage-demo');
  const action = (await store.read()).actions[0];
  assert.equal(action.usage.count, 1);
  assert.ok(action.usage.week.count >= 1);
  assert.ok(action.usage.month.count >= 1);
});

test('archives test-era actions directory and starts with an empty library', async () => {
  const dataDir = await tempData();
  await fs.mkdir(path.join(dataDir, 'actions', 'legacy'), { recursive: true });
  await fs.writeFile(path.join(dataDir, 'actions', 'legacy', 'action.json'), '{}');
  const store = createStore({ dataDir });
  assert.deepEqual((await store.read()).actions, []);
  const entries = await fs.readdir(dataDir);
  assert.ok(entries.some((name) => name.startsWith('backup-v5-test-')));
});

test('normalizeScope drops invalid projects and defaults to all', () => {
  assert.deepEqual(normalizeScope(null), { mode: 'all', projects: [] });
  const scoped = normalizeScope({ mode: 'projects', projects: [{ path: 'C:/a' }, { path: '' }, null] });
  assert.equal(scoped.projects.length, 1);
  assert.equal(scoped.projects[0].label, 'a');
});

test('migrates legacy per-Action scopes into groups and project profiles', async () => {
  const dataDir = await tempData();
  await fs.mkdir(path.join(dataDir, 'library', 'legacy'), { recursive: true });
  await fs.writeFile(path.join(dataDir, 'library', 'legacy', 'SKILL.md'), '---\nname: legacy\ndescription: Legacy\n---\n\nBody.\n');
  await fs.writeFile(path.join(dataDir, 'state.json'), JSON.stringify({
    format: 'dsh-action-hub/state@1',
    entries: {
      legacy: { mode: 'command', scope: { mode: 'projects', projects: [{ label: 'AgilityDog', path: 'C:/AgilityDog' }] } },
    },
  }));
  const store = createStore({ dataDir });
  const result = await store.read();
  assert.equal(result.state.groups[0].id, 'common');
  assert.deepEqual(result.actions[0].groups, []);
  assert.deepEqual(result.state.projects[0].actions, ['legacy']);
  assert.deepEqual(result.state.projects[0].groups, ['common']);
  assert.equal((await store.readState()).format, 'dsh-action-hub/state@2');
});

test('drops state entries when a skill is deleted outside the plugin', async () => {
  const dataDir = await tempData();
  const store = createStore({ dataDir });
  await store.create({ name: 'orphan', description: 'Orphan', prompt: 'Body.' });
  assert.deepEqual(Object.keys((await store.readState()).entries), ['orphan']);
  await fs.rm(path.join(dataDir, 'library', 'orphan'), { recursive: true, force: true });
  await store.read({ prune: true });
  assert.deepEqual(Object.keys((await store.readState()).entries), []);
});
