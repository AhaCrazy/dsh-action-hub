import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  addResourceFile,
  deleteResourceFile,
  exportResourceFiles,
  listResources,
  normalizeResourceMeta,
  readInvocationResources,
  readResourcePreviews,
  removeResources,
  resourceDir,
  safeFileName,
  safeRelativeName,
  writeResourceEntries,
} from '../resources.js';

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'dsh-action-resources-'));
}

test('safe names reject traversal and flatten browser names', () => {
  assert.equal(safeFileName('../../etc/passwd'), 'passwd');
  assert.equal(safeFileName('C:\\temp\\a.txt'), 'a.txt');
  assert.equal(safeFileName('..'), null);
  assert.equal(safeRelativeName('docs/guide.md'), 'docs/guide.md');
  assert.equal(safeRelativeName('../escape.txt'), null);
  assert.equal(safeRelativeName('a/../../b.txt'), null);
});

test('resource files round-trip, list, preview, and delete', async () => {
  const root = await tempDir();
  const dir = resourceDir(root, 'test-action');
  try {
    const meta = await writeResourceEntries(dir, [
      { name: 'template.py', contentBase64: Buffer.from('print(1)\n').toString('base64') },
      { name: '../bad.txt', contentBase64: 'eA==' },
    ]);
    assert.equal(meta.length, 1);
    assert.equal(meta[0].name, 'template.py');
    const listed = await listResources(dir);
    assert.deepEqual(listed.map((entry) => entry.name), ['template.py']);
    const previews = await readResourcePreviews(dir, listed);
    assert.equal(previews[0].text, 'print(1)\n');
    const exported = await exportResourceFiles(dir, listed);
    assert.equal(exported[0].contentBase64, Buffer.from('print(1)\n').toString('base64'));

    const withDoc = await addResourceFile(dir, 'docs/notes.md', Buffer.from('# notes\n'), listed);
    assert.deepEqual(withDoc.map((entry) => entry.name), ['docs/notes.md', 'template.py']);
    const afterDelete = await deleteResourceFile(dir, 'docs/notes.md', withDoc);
    assert.deepEqual(afterDelete.map((entry) => entry.name), ['template.py']);

    const context = await readInvocationResources(root, { id: 'test-action', resources: afterDelete });
    assert.equal(context.files.length, 1);
    assert.equal(context.files[0].text, 'print(1)\n');
  } finally {
    await removeResources(dir);
    await rm(root, { recursive: true, force: true });
  }
});

test('normalizeResourceMeta clamps and deduplicates entries', () => {
  const meta = normalizeResourceMeta([
    { name: 'a.txt', bytes: 3 },
    { name: 'a.txt', bytes: 9 },
    { name: '../x', bytes: 1 },
    { name: 'b/c.txt', bytes: -5 },
  ]);
  assert.deepEqual(meta, [{ name: 'a.txt', bytes: 3 }, { name: 'b/c.txt', bytes: 0 }]);
});
