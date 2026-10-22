import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { importAssistPackage, prepareAssist, startAssistWatcher } from '../assist.js';
import { createStore } from '../store.js';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dsh-action-assist-'));
  const skillDir = path.join(root, 'skill');
  await mkdir(path.join(skillDir, 'templates'), { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: demo-skill\ndescription: demo\n---\n\nDo the thing.\n', 'utf8');
  await writeFile(path.join(skillDir, 'templates', 'run.sh'), 'echo hi\n', 'utf8');
  const dataDir = path.join(root, 'data');
  const store = createStore({ dataDir, seed: false });
  return { root, skillDir, dataDir, store };
}

test('prepareAssist builds a conversion brief and inbox path', async () => {
  const { root, skillDir, dataDir } = await fixture();
  try {
    const prepared = await prepareAssist(dataDir, skillDir);
    assert.equal(prepared.skill.name, 'demo-skill');
    assert.ok(prepared.inboxFile.includes('inbox'));
    assert.match(prepared.prompt, /SKILL\.md/u);
    assert.match(prepared.prompt, /templates\/run\.sh/u);
    assert.match(prepared.prompt, /Do the thing\./u);
    assert.match(prepared.prompt, /Action Hub/u);
    assert.match(prepared.prompt, new RegExp(prepared.inboxFile.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('importAssistPackage creates an Action plus selected resources', async () => {
  const { root, skillDir, dataDir, store } = await fixture();
  try {
    const { action, resources } = await importAssistPackage(store, dataDir, {
      action: { name: 'Demo', prompt: 'Do it with {{args}}', argsHint: 'target' },
      source: { name: 'demo-skill', path: skillDir },
      resources: [{ name: 'templates/run.sh', path: path.join(skillDir, 'templates', 'run.sh') }],
    });
    assert.equal(action.name, 'Demo');
    assert.deepEqual(resources.map((entry) => entry.name), ['templates/run.sh']);
    const state = await store.read();
    assert.equal(state.actions.length, 1);
    assert.equal(state.actions[0].resources[0].name, 'templates/run.sh');
    assert.equal(state.actions[0].source.kind, 'skill');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('importAssistPackage rejects resources outside the Skill directory', async () => {
  const { root, skillDir, dataDir, store } = await fixture();
  try {
    const outside = path.join(root, 'outside.txt');
    await writeFile(outside, 'secret', 'utf8');
    const { resources } = await importAssistPackage(store, dataDir, {
      action: { name: 'Demo', prompt: 'Do it' },
      source: { name: 'demo-skill', path: skillDir },
      resources: [{ name: 'outside.txt', path: outside }],
    });
    assert.deepEqual(resources, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('importAssistPackage requires source path', async () => {
  const { root, dataDir, store } = await fixture();
  try {
    await assert.rejects(importAssistPackage(store, dataDir, { action: { name: 'Demo', prompt: 'x' } }), /source\.path/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the inbox watcher imports a written package and removes it', async () => {
  const { root, skillDir, dataDir, store } = await fixture();
  const ctx = { logger: { info() {}, warn() {} } };
  const dispose = startAssistWatcher(ctx, store, dataDir);
  try {
    const inbox = path.join(dataDir, 'inbox');
    await mkdir(inbox, { recursive: true });
    const packageFile = path.join(inbox, 'token.json');
    await writeFile(packageFile, JSON.stringify({
      action: { name: 'Watched', prompt: 'execute' },
      source: { name: 'demo-skill', path: skillDir },
      resources: [{ name: 'templates/run.sh', path: path.join(skillDir, 'templates', 'run.sh') }],
    }), 'utf8');
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if ((await store.read()).actions.length > 0) break;
    }
    const state = await store.read();
    assert.equal(state.actions.length, 1);
    assert.equal(state.actions[0].name, 'Watched');
    assert.equal(await readFile(packageFile, 'utf8').catch(() => null), null);
  } finally {
    dispose();
    await rm(root, { recursive: true, force: true });
  }
});
