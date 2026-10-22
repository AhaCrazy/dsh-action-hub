import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  SEED_ACTIONS,
  createStore,
  defaultDataDir,
  expandPrompt,
  hasArgumentPlaceholder,
  matchesQuery,
  mergeActions,
  mintId,
  normalizeAction,
  parseState,
  slugify,
  sortActions,
  validateAction,
} from '../store.js';

async function withTempDir(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-action-hub-'));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('expandPrompt fills arguments and leaves unknown tokens alone', () => {
  assert.equal(expandPrompt('a {{args}} b', { args: 'X' }), 'a X b');
  assert.equal(expandPrompt('run $ARGUMENTS', { args: 'src/' }), 'run src/');
  assert.equal(expandPrompt('no slot', { args: 'tail' }), 'no slot\n\ntail');
  assert.equal(expandPrompt('{{date}}', { date: new Date(2026, 9, 22) }), '2026-10-22');
  assert.equal(expandPrompt('{{unknown}}', { args: '' }), '{{unknown}}');
  assert.equal(expandPrompt('body\n\n{{args}}', { args: '' }), 'body');
  assert.equal(expandPrompt('body\n\n{{args}}', { args: 'x' }), 'body\n\nx');
  assert.equal(expandPrompt('a\n\n\n\nb', { args: '' }), 'a\n\nb');
  assert.equal(hasArgumentPlaceholder('{{args}}'), true);
  assert.equal(hasArgumentPlaceholder('plain'), false);
});

test('slugify and mintId keep ids readable and unique', () => {
  assert.equal(slugify('Code Review'), 'code-review');
  assert.equal(slugify('  git-svn push  '), 'git-svn-push');
  assert.equal(slugify('!!!'), 'action');
  const first = mintId('same');
  const second = mintId('same');
  assert.match(first, /^same-[0-9a-f]{6}$/);
  assert.notEqual(first, second);
});

test('normalizeAction clamps fields and keeps identity stable', () => {
  const created = normalizeAction({
    name: '  My Action  ',
    description: ' d ',
    category: 'cat',
    tags: ['a', 'a', ' b '],
    prompt: 'body',
    argsHint: 'arg',
    usage: { count: 2, lastAt: 100 },
  }, { now: 1000 });
  assert.equal(created.name, 'My Action');
  assert.equal(created.prompt, 'body');
  assert.deepEqual(created.tags, ['a', 'b']);
  assert.equal(created.createdAt, 1000);
  assert.match(created.id, /^my-action-[0-9a-f]{6}$/);

  const updated = normalizeAction({ name: 'Renamed' }, { id: created.id, previous: created, now: 2000 });
  assert.equal(updated.id, created.id);
  assert.equal(updated.createdAt, 1000);
  assert.equal(updated.updatedAt, 2000);
  assert.equal(updated.prompt, 'body');
  assert.equal(updated.usage.count, 2);
});

test('validateAction rejects missing name or prompt', () => {
  assert.equal(validateAction({ name: '', prompt: 'x' }).ok, false);
  assert.equal(validateAction({ name: 'x', prompt: '' }).ok, false);
  assert.equal(validateAction({ name: 'x', prompt: 'y' }).ok, true);
});

test('sortActions puts pinned first, then recently used, category and name', () => {
  const actions = [
    { name: 'b', category: 'z', usage: { lastAt: 0 } },
    { name: 'a', category: 'z', usage: { lastAt: 0 } },
    { name: 'c', category: 'a', usage: { lastAt: 5 } },
    { name: 'pinned', category: 'z', usage: { lastAt: 0 }, pinned: true },
  ];
  assert.deepEqual(sortActions(actions).map((action) => action.name), ['pinned', 'c', 'a', 'b']);
});

test('normalizeAction keeps and toggles pinned without disturbing identity', () => {
  const base = normalizeAction({ name: 'Pin me', prompt: 'body' });
  assert.equal(base.pinned, false);
  const pinned = normalizeAction({ pinned: true }, { id: base.id, previous: base });
  assert.equal(pinned.pinned, true);
  assert.equal(pinned.name, 'Pin me');
  const kept = normalizeAction({ name: 'Pin me again' }, { id: base.id, previous: pinned });
  assert.equal(kept.pinned, true);
});

test('normalizeAction keeps resource metadata and drops unsafe names', () => {
  const action = normalizeAction({
    name: 'Big task',
    prompt: 'work',
    resources: [
      { name: 'templates/deploy.yml', bytes: 120 },
      { name: '../escape.sh', bytes: 10 },
      { name: 'templates/deploy.yml', bytes: 999 },
    ],
  });
  assert.deepEqual(action.resources, [{ name: 'templates/deploy.yml', bytes: 120 }]);
  const updated = normalizeAction({ name: 'Big task v2' }, { id: action.id, previous: action });
  assert.deepEqual(updated.resources, [{ name: 'templates/deploy.yml', bytes: 120 }]);
});

test('matchesQuery searches name, description, category, tags, and prompt', () => {
  const action = { name: 'Code Review', description: 'diff reader', category: 'dev', tags: ['git'], prompt: 'inspect changes' };
  assert.equal(matchesQuery(action, 'review'), true);
  assert.equal(matchesQuery(action, 'git dev'), true);
  assert.equal(matchesQuery(action, 'inspect'), true);
  assert.equal(matchesQuery(action, 'missing'), false);
  assert.equal(matchesQuery(action, ''), true);
});

test('mergeActions adds, updates by id, and replaces', () => {
  const current = [normalizeAction({ id: 'keep', name: 'Keep', prompt: 'old' })];
  const merged = mergeActions(current, [
    { id: 'keep', name: 'Keep 2', prompt: 'new' },
    { name: 'Fresh', prompt: 'fresh body' },
  ], 'merge');
  assert.equal(merged.added, 1);
  assert.equal(merged.updated, 1);
  assert.equal(merged.actions.length, 2);
  assert.equal(merged.actions.find((entry) => entry.id === 'keep').name, 'Keep 2');

  const replaced = mergeActions(current, [{ name: 'Only', prompt: 'body' }], 'replace');
  assert.equal(replaced.actions.length, 1);
  assert.equal(replaced.actions[0].name, 'Only');
});

test('parseState accepts a bare array from a hand-edited file', () => {
  const state = parseState(JSON.stringify([{ name: 'A', prompt: 'p' }]), false);
  assert.equal(state.version, 1);
  assert.equal(state.actions.length, 1);
  assert.throws(() => parseState('{"nope":true}', false), /actions/);
});

test('defaultDataDir honours DSH_HOME', () => {
  assert.equal(defaultDataDir({ DSH_HOME: 'C:\\home\\.dsh' }), path.join('C:\\home\\.dsh', 'action-hub'));
  assert.ok(defaultDataDir({}).endsWith(path.join('.dsh', 'action-hub')));
});

test('store seeds, creates, updates, duplicates, deletes, and persists', async () => {
  await withTempDir(async (dir) => {
    const store = createStore({ dataDir: dir, seed: true });
    const initial = await store.read();
    assert.equal(initial.actions.length, SEED_ACTIONS.length);
    const file = JSON.parse(await readFile(path.join(dir, 'actions.json'), 'utf8'));
    assert.equal(file.actions.length, SEED_ACTIONS.length);

    const created = await store.mutate((draft) => {
      const action = normalizeAction({ name: 'Mine', prompt: 'do it', category: 'dev' });
      draft.actions = [...draft.actions, action];
      return action;
    });
    assert.equal(created.result.name, 'Mine');

    const updated = await store.mutate((draft) => {
      draft.actions = draft.actions.map((entry) => (entry.id === created.result.id ? { ...entry, name: 'Mine 2' } : entry));
      return 'ok';
    });
    assert.equal(updated.state.actions.find((entry) => entry.id === created.result.id).name, 'Mine 2');

    const removed = await store.mutate((draft) => {
      draft.actions = draft.actions.filter((entry) => entry.id !== created.result.id);
      return draft.actions.length;
    });
    assert.equal(removed.result, SEED_ACTIONS.length);

    const reloaded = createStore({ dataDir: dir, seed: false });
    assert.equal((await reloaded.read()).actions.length, SEED_ACTIONS.length);
  });
});

test('store tolerates a corrupt-free empty directory and writes the file', async () => {
  await withTempDir(async (dir) => {
    const store = createStore({ dataDir: dir, seed: false });
    const state = await store.read();
    assert.deepEqual(state.actions, []);
    const text = await readFile(path.join(dir, 'actions.json'), 'utf8');
    assert.equal(JSON.parse(text).actions.length, 0);
    await writeFile(path.join(dir, 'unrelated.txt'), 'x', 'utf8');
  });
});
