import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { canonicalPath, resolveProjectRoot, scopeAllows } from '../host/scope.js';
import { findCurrentProject } from '../host/projects.js';

async function tempProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ah-scope-'));
  const nested = path.join(root, 'packages', 'app');
  await fs.mkdir(nested, { recursive: true });
  return { root, nested };
}

test('a registered workspace ancestor wins over a nested directory', async () => {
  const { root, nested } = await tempProject();
  const projects = [{ label: 'root', path: root }];
  assert.equal(await resolveProjectRoot(nested, projects), canonicalPath(root));
  assert.equal(scopeAllows({ mode: 'projects', projects }, canonicalPath(root)), true);
  assert.equal(scopeAllows({ mode: 'projects', projects }, canonicalPath(nested)), false);
});

test('an unregistered nested cwd still resolves to itself', async () => {
  const { nested } = await tempProject();
  assert.equal(canonicalPath(await resolveProjectRoot(nested, [])), canonicalPath(nested));
});

test('findCurrentProject selects the session cwd inside a registered project', async () => {
  const { root, nested } = await tempProject();
  const projects = [{ label: 'root', path: root }];
  const ctx = {
    get(name) {
      if (name !== 'sessions') return undefined;
      return { list: () => [{ header: { cwd: nested } }] };
    },
  };
  assert.deepEqual(await findCurrentProject(ctx, projects), projects[0]);
});

test('findCurrentProject fails closed when the session is outside every project', async () => {
  const { root } = await tempProject();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'ah-outside-'));
  const ctx = {
    get(name) {
      if (name !== 'sessions') return undefined;
      return { list: () => [{ header: { cwd: outside } }] };
    },
  };
  assert.equal(await findCurrentProject(ctx, [{ label: 'root', path: root }]), null);
});
