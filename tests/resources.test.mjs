import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { listResources, readInvocationResources, readResourcePreviews } from '../resources.js';

test('lists resources without SKILL.md or hidden files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ah-res-'));
  await fs.writeFile(path.join(dir, 'SKILL.md'), '---\nname: demo\ndescription: d\n---\n\nbody\n');
  await fs.writeFile(path.join(dir, 'guide.md'), 'hello');
  await fs.mkdir(path.join(dir, 'nested'));
  await fs.writeFile(path.join(dir, 'nested', 'a.txt'), 'a');
  await fs.writeFile(path.join(dir, '.hidden'), 'hidden');
  const entries = await listResources(dir);
  assert.deepEqual(entries.map((entry) => entry.name), ['guide.md', 'nested/a.txt']);
  assert.equal(entries[0].bytes, 5);
});

test('previews and inlines small text resources', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ah-res-'));
  await fs.writeFile(path.join(dir, 'SKILL.md'), 'x');
  await fs.writeFile(path.join(dir, 'guide.md'), 'hello');
  const previews = await readResourcePreviews(dir, []);
  assert.equal(previews[0].name, 'guide.md');
  assert.equal(previews[0].text, 'hello');
  const invocation = await readInvocationResources('/tmp', { id: 'demo', dir, resources: [] }, dir);
  assert.equal(invocation.files[0].text, 'hello');
});
