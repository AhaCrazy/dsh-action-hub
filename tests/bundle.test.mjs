import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { exportActionFolder, exportAllFolder, exportZipBuffer, importFolder, importZipBuffer } from '../bundle.js';
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

test('folder export and import keep files and allocate a new id on collision', async () => {
  const { dataDir, store, action } = await seededStore();
  const target = await tempDir();
  try {
    const exported = await exportActionFolder(store, dataDir, action.id, target);
    assert.ok(exported.path.endsWith(action.id));
    assert.equal(await readFile(path.join(exported.path, 'files', 'templates', 'run.sh'), 'utf8'), 'echo hi\n');

    const imported = await importFolder(store, dataDir, exported.path);
    assert.equal(imported.actions.length, 1);
    assert.equal(imported.renamed, 1);
    assert.notEqual(imported.actions[0].id, action.id);
    assert.equal(await readFile(path.join(dataDir, 'actions', imported.actions[0].id, 'files', 'templates', 'run.sh'), 'utf8'), 'echo hi\n');
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(target, { recursive: true, force: true });
  }
});

test('zip export and import preserve Action and resource bytes', async () => {
  const { dataDir, store, action } = await seededStore();
  try {
    const zip = await exportZipBuffer(store, dataDir, action.id);
    const imported = await importZipBuffer(store, dataDir, zip.buffer);
    assert.equal(imported.actions.length, 1);
    assert.equal(imported.renamed, 1);
    assert.equal(await readFile(path.join(dataDir, 'actions', imported.actions[0].id, 'files', 'templates', 'run.sh'), 'utf8'), 'echo hi\n');
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('whole-library folder export writes every Action', async () => {
  const { dataDir, store, action } = await seededStore();
  const target = await tempDir();
  try {
    const exported = await exportAllFolder(store, dataDir, target);
    assert.equal(exported.count, 1);
    const bundleDir = path.join(exported.path, action.id);
    const document = JSON.parse(await readFile(path.join(bundleDir, 'action.json'), 'utf8'));
    assert.equal(document.action.id, action.id);
    assert.equal(await readFile(path.join(bundleDir, 'files', 'templates', 'run.sh'), 'utf8'), 'echo hi\n');
  } finally {
    await rm(dataDir, { recursive: true, force: true });
    await rm(target, { recursive: true, force: true });
  }
});
