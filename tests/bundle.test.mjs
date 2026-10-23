import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  applyFolderPlan,
  applyZipPlan,
  exportZipBuffer,
  previewFolder,
  previewZipBuffer,
} from '../bundle.js';
import { createZip, readZip } from '../zip.js';
import { normalizeAction, createStore } from '../store.js';

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'dsh-action-bundle-'));
}

async function seededStore() {
  const dataDir = await tempDir();
  const store = createStore({ dataDir, seed: false });
  const action = normalizeAction({ name: 'Bundle Test', prompt: 'do it', category: 'test' });
  await store.mutate((draft) => {
    draft.actions = [...draft.actions, action];
  });
  await mkdir(path.join(dataDir, 'actions', action.id, 'files', 'templates'), { recursive: true });
  await writeFile(path.join(dataDir, 'actions', action.id, 'files', 'templates', 'run.sh'), 'echo hi\n', 'utf8');
  return { dataDir, store, action };
}

async function freshStore() {
  const dataDir = await tempDir();
  const store = createStore({ dataDir, seed: false });
  await store.read();
  return { dataDir, store };
}

function decisionsFor(preview, mode = undefined) {
  return preview.items.map((item) => ({
    key: item.key,
    mode: mode ?? item.defaultMode,
    fingerprint: item.fingerprint,
  }));
}

test('zip round-trips UTF-8 names and empty entries', () => {
  const zip = createZip([
    { name: 'a/hello.txt', data: Buffer.from('hello\n') },
    { name: 'a/中文.md', data: Buffer.from('# 标题\n') },
    { name: 'a/empty', data: Buffer.alloc(0) },
  ]);
  const entries = readZip(zip);
  assert.equal(entries.get('a/hello.txt').toString(), 'hello\n');
  assert.equal(entries.get('a/中文.md').toString(), '# 标题\n');
  assert.equal(entries.get('a/empty').length, 0);
  assert.throws(() => readZip(Buffer.from('not a zip')), /ZIP/u);
});

test('folder preview adds a new Action and a repeated import is a duplicate', async () => {
  const { dataDir, store, action } = await seededStore();
  const target = await tempDir();
  const fresh = await freshStore();
  try {
    const bundleDir = path.join(target, action.id);
    await cp(path.join(dataDir, 'actions', action.id), bundleDir, { recursive: true });
    const preview = await previewFolder(fresh.store, fresh.dataDir, bundleDir);
    assert.equal(preview.items[0].status, 'new');
    const created = await applyFolderPlan(fresh.store, fresh.dataDir, bundleDir, decisionsFor(preview));
    assert.equal(created.imported, 1);
    assert.equal(await readFile(path.join(fresh.dataDir, 'actions', created.actions[0].id, 'files', 'templates', 'run.sh'), 'utf8'), 'echo hi\n');

    const repeated = await previewFolder(fresh.store, fresh.dataDir, bundleDir);
    assert.equal(repeated.items[0].status, 'duplicate');
    const skipped = await applyFolderPlan(fresh.store, fresh.dataDir, bundleDir, decisionsFor(repeated));
    assert.equal(skipped.imported, 0);
    assert.equal(skipped.duplicated, 1);
    assert.equal((await fresh.store.read()).actions.length, 1);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(fresh.dataDir, { recursive: true, force: true });
    await rm(target, { recursive: true, force: true });
  }
});

test('same ZIP imported twice is idempotent', async () => {
  const { dataDir, store, action } = await seededStore();
  const fresh = await freshStore();
  try {
    const zip = await exportZipBuffer(store, dataDir, action.id);
    const first = await previewZipBuffer(fresh.store, fresh.dataDir, zip.buffer);
    await applyZipPlan(fresh.store, fresh.dataDir, zip.buffer, decisionsFor(first));
    const second = await previewZipBuffer(fresh.store, fresh.dataDir, zip.buffer);
    assert.equal(second.items[0].status, 'duplicate');
    const result = await applyZipPlan(fresh.store, fresh.dataDir, zip.buffer, decisionsFor(second));
    assert.equal(result.imported, 0);
    assert.equal((await fresh.store.read()).actions.length, 1);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(fresh.dataDir, { recursive: true, force: true });
  }
});

test('an untouched imported Action updates in place when the source changes', async () => {
  const { dataDir, store, action } = await seededStore();
  const fresh = await freshStore();
  try {
    const firstZip = await exportZipBuffer(store, dataDir, action.id);
    const firstPreview = await previewZipBuffer(fresh.store, fresh.dataDir, firstZip.buffer);
    const created = await applyZipPlan(fresh.store, fresh.dataDir, firstZip.buffer, decisionsFor(firstPreview));
    const importedId = created.actions[0].id;

    await store.mutate((draft) => {
      draft.actions = draft.actions.map((entry) => (entry.id === action.id ? { ...entry, prompt: 'do it v2', updatedAt: Date.now() } : entry));
    });
    const secondZip = await exportZipBuffer(store, dataDir, action.id);
    const updatePreview = await previewZipBuffer(fresh.store, fresh.dataDir, secondZip.buffer);
    assert.equal(updatePreview.items[0].status, 'update');
    assert.equal(updatePreview.items[0].defaultMode, 'update');
    const updated = await applyZipPlan(fresh.store, fresh.dataDir, secondZip.buffer, decisionsFor(updatePreview));
    assert.equal(updated.updated, 1);
    assert.equal(updated.imported, 0);
    const state = await fresh.store.read();
    assert.equal(state.actions.length, 1);
    assert.equal(state.actions[0].id, importedId);
    assert.equal(state.actions[0].prompt, 'do it v2');
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(fresh.dataDir, { recursive: true, force: true });
  }
});

test('a locally modified Action is protected from re-import', async () => {
  const { dataDir, store, action } = await seededStore();
  const fresh = await freshStore();
  try {
    const firstZip = await exportZipBuffer(store, dataDir, action.id);
    const firstPreview = await previewZipBuffer(fresh.store, fresh.dataDir, firstZip.buffer);
    const created = await applyZipPlan(fresh.store, fresh.dataDir, firstZip.buffer, decisionsFor(firstPreview));
    await fresh.store.mutate((draft) => {
      draft.actions = draft.actions.map((entry) => (entry.id === created.actions[0].id ? { ...entry, prompt: 'local edit' } : entry));
    });

    await store.mutate((draft) => {
      draft.actions = draft.actions.map((entry) => (entry.id === action.id ? { ...entry, prompt: 'source v3' } : entry));
    });
    const secondZip = await exportZipBuffer(store, dataDir, action.id);
    const preview = await previewZipBuffer(fresh.store, fresh.dataDir, secondZip.buffer);
    assert.equal(preview.items[0].status, 'conflict');
    assert.equal(preview.items[0].defaultMode, 'skip');
    const result = await applyZipPlan(fresh.store, fresh.dataDir, secondZip.buffer, decisionsFor(preview));
    assert.equal(result.imported, 0);
    assert.equal(result.updated, 0);
    assert.equal(result.conflicts, 1);
    assert.equal((await fresh.store.read()).actions[0].prompt, 'local edit');
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(fresh.dataDir, { recursive: true, force: true });
  }
});

test('zip export accepts an explicit selection of Actions', async () => {
  const { dataDir, store, action } = await seededStore();
  try {
    const second = normalizeAction({ name: 'Second', prompt: 'two' });
    await store.mutate((draft) => {
      draft.actions = [...draft.actions, second];
    });
    const zip = await exportZipBuffer(store, dataDir, [action.id]);
    const entries = readZip(zip.buffer);
    assert.equal([...entries.keys()].every((name) => name.startsWith(action.id)), true);
    assert.equal(zip.count, 1);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('preview exposes per-item decisions for a multi-Action ZIP', async () => {
  const { dataDir, store, action } = await seededStore();
  const fresh = await freshStore();
  try {
    const second = normalizeAction({ name: 'Second', prompt: 'two' });
    await store.mutate((draft) => {
      draft.actions = [...draft.actions, second];
    });
    const zip = await exportZipBuffer(store, dataDir);
    const preview = await previewZipBuffer(fresh.store, fresh.dataDir, zip.buffer);
    assert.equal(preview.items.length, 2);
    assert.equal(preview.items.every((item) => item.status === 'new'), true);
    assert.deepEqual(preview.items[0].modes, ['create', 'skip']);
    const result = await applyZipPlan(fresh.store, fresh.dataDir, zip.buffer, decisionsFor(preview));
    assert.equal(result.imported, 2);
    assert.equal((await fresh.store.read()).actions.length, 2);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(fresh.dataDir, { recursive: true, force: true });
  }
});
