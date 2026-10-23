import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createStore } from '../store.js';
import { exportZipBuffer, previewFolder, previewZipBuffer, applyFolderPlan, applyZipPlan } from '../bundle.js';

async function writeSkill(root, name, body = 'Do it.') {
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: demo ${name}\n---\n\n${body}\n`);
  return dir;
}

test('previews and imports a standard skill folder', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ah-bundle-'));
  const dataDir = path.join(base, 'data');
  const source = path.join(base, 'source');
  await writeSkill(source, 'standard-demo');
  const store = createStore({ dataDir });
  const preview = await previewFolder(store, dataDir, source);
  assert.equal(preview.items.length, 1);
  assert.equal(preview.items[0].status, 'new');
  const result = await applyFolderPlan(store, dataDir, source, [{ key: 'standard-demo', mode: 'create' }], []);
  assert.equal(result.imported, 1);
  const action = (await store.read()).actions[0];
  assert.equal(action.name, 'standard-demo');
  assert.equal(action.mode, 'command');
  const skill = await fs.readFile(path.join(dataDir, 'library', 'standard-demo', 'SKILL.md'), 'utf8');
  assert.match(skill, /name: standard-demo/u);
});

test('exports a standard directory and re-imports it', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ah-bundle-'));
  const dataDir = path.join(base, 'data');
  const source = path.join(base, 'source');
  await writeSkill(source, 'roundtrip');
  await fs.writeFile(path.join(source, 'roundtrip', 'notes.md'), 'resource');
  const store = createStore({ dataDir });
  await applyFolderPlan(store, dataDir, source, [{ key: 'roundtrip', mode: 'create' }], []);
  const zipped = await exportZipBuffer(store, dataDir);
  assert.ok(zipped.buffer.length > 20);
  const other = createStore({ dataDir: path.join(base, 'other') });
  const preview = await previewZipBuffer(other, path.join(base, 'other'), zipped.buffer);
  assert.equal(preview.items[0].name, 'roundtrip');
  const result = await applyZipPlan(other, path.join(base, 'other'), zipped.buffer, [{ key: 'roundtrip', mode: 'create' }], []);
  assert.equal(result.imported, 1);
});

test('marks a same-name changed skill as update and a duplicate as duplicate', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ah-bundle-'));
  const dataDir = path.join(base, 'data');
  const source = path.join(base, 'source');
  await writeSkill(source, 'same-name', 'first');
  const store = createStore({ dataDir });
  await applyFolderPlan(store, dataDir, source, [{ key: 'same-name', mode: 'create' }], []);
  const duplicate = await previewFolder(store, dataDir, source);
  assert.equal(duplicate.items[0].status, 'duplicate');
  await fs.writeFile(path.join(source, 'same-name', 'SKILL.md'), '---\nname: same-name\ndescription: demo\n---\n\nsecond\n');
  const updated = await previewFolder(store, dataDir, source);
  assert.equal(updated.items[0].status, 'update');
});

test('rejects a folder with an invalid SKILL.md', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ah-bundle-'));
  const source = path.join(base, 'bad');
  await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'SKILL.md'), '---\nname: Bad Name\ndescription: x\n---\n\nbody\n');
  const store = createStore({ dataDir: path.join(base, 'data') });
  await assert.rejects(() => previewFolder(store, path.join(base, 'data'), source), /SKILL\.md 无效/u);
});
