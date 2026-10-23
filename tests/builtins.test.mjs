import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { clearBuiltinCache, defaultBuiltinRoot, loadBuiltinActions } from '../builtins.js';
import { readBuiltinState, updateBuiltinState } from '../builtin-state.js';
import { bumpUsage, currentUsagePeriods } from '../store.js';

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'dsh-action-builtin-'));
}

test('built-in loader reads standard Action directories and their files', async () => {
  const root = await tempDir();
  try {
    const dir = path.join(root, 'demo');
    await mkdir(path.join(dir, 'files', 'docs'), { recursive: true });
    await writeFile(path.join(dir, 'files', 'docs', 'guide.md'), '# guide\n', 'utf8');
    await writeFile(path.join(dir, 'action.json'), JSON.stringify({
      format: 'dsh-action-hub/action@1',
      action: { id: 'demo-builtin', name: 'Demo builtin', prompt: 'do it', category: 'Built-in' },
      resources: [],
    }), 'utf8');
    await mkdir(path.join(root, 'broken'), { recursive: true });
    await writeFile(path.join(root, 'broken', 'action.json'), '{not json', 'utf8');

    const actions = await loadBuiltinActions(root);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].id, 'demo-builtin');
    assert.equal(actions[0].builtin, true);
    assert.deepEqual(actions[0].resources, [{ name: 'docs/guide.md', bytes: 8 }]);
    assert.equal(actions[0].builtinDir, dir);
  } finally {
    await rm(root, { recursive: true, force: true });
    clearBuiltinCache();
  }
});

test('the packaged built-in directory contains the import assistant', async () => {
  clearBuiltinCache();
  const actions = await loadBuiltinActions(defaultBuiltinRoot());
  assert.ok(actions.some((action) => action.id === 'action-import-assistant' && action.builtin === true));
});

test('built-in state persists pins and usage without touching the Action store', async () => {
  const dir = await tempDir();
  try {
    assert.deepEqual(await readBuiltinState(dir), { pinned: {}, usage: {} });
    const next = await updateBuiltinState(dir, (state) => ({
      ...state,
      pinned: { 'action-import-assistant': true },
      usage: { 'action-import-assistant': bumpUsage(undefined, 1_700_000_000_000) },
    }));
    assert.equal(next.pinned['action-import-assistant'], true);
    assert.equal(next.usage['action-import-assistant'].count, 1);
    const again = await readBuiltinState(dir);
    assert.equal(again.pinned['action-import-assistant'], true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('usage counters track total, week, and month periods', () => {
  const periods = currentUsagePeriods(Date.UTC(2026, 9, 22, 12));
  assert.match(periods.week, /^\d{4}-\d{2}-\d{2}$/u);
  assert.match(periods.month, /^\d{4}-\d{2}$/u);
  const first = bumpUsage(undefined, 1_700_000_000_000);
  assert.deepEqual(
    { count: first.count, week: first.week.key, month: first.month.key },
    { count: 1, week: first.week.key, month: first.month.key },
  );
  const second = bumpUsage(first, 1_700_000_000_000);
  assert.equal(second.count, 2);
  assert.equal(second.week.count, 2);
  assert.equal(second.month.count, 2);
});
