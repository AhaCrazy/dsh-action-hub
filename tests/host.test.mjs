import assert from 'node:assert/strict';
import test from 'node:test';

import { internals, parseActionCommand } from '../index.js';

const { originAllowed, exportable, planActionSkills } = internals;

function fakeCtx(origin) {
  return { webServer: { getOrigin: () => origin } };
}

test('originAllowed accepts same-origin, no-origin, and same-host requests', () => {
  assert.equal(originAllowed(fakeCtx('http://127.0.0.1:53213'), { headers: {} }), true);
  assert.equal(
    originAllowed(fakeCtx('http://127.0.0.1:53213'), { headers: { origin: 'http://127.0.0.1:53213' } }),
    true,
  );
  assert.equal(
    originAllowed(fakeCtx('http://127.0.0.1:53213/'), { headers: { origin: 'http://127.0.0.1:53213' } }),
    true,
  );
  assert.equal(
    originAllowed(fakeCtx('http://127.0.0.1:53213'), { headers: { origin: 'https://evil.example' } }),
    false,
  );
});

test('originAllowed falls back to the Host header without a live origin', () => {
  const broken = { webServer: { getOrigin: () => { throw new Error('no origin'); } } };
  assert.equal(originAllowed(broken, { headers: { origin: 'http://localhost:1', host: 'localhost:1' } }), true);
  assert.equal(originAllowed(broken, { headers: { origin: 'http://localhost:2', host: 'localhost:1' } }), false);
  assert.equal(originAllowed(broken, { headers: { origin: 'not a url' } }), false);
});

test('exportable drops per-machine usage counters but keeps content', () => {
  const exported = exportable({
    id: 'a-1',
    name: 'A',
    description: 'd',
    category: 'c',
    tags: ['t'],
    prompt: 'p',
    argsHint: 'h',
    createdAt: 1,
    updatedAt: 2,
    usage: { count: 9, lastAt: 10 },
    source: { kind: 'skill', name: 's' },
    extra: 'dropped',
  });
  assert.deepEqual(Object.keys(exported).sort(), [
    'argsHint', 'category', 'createdAt', 'description', 'id', 'name', 'pinned', 'prompt', 'source', 'tags', 'updatedAt',
  ]);
  assert.equal(exported.usage, undefined);
  assert.equal(exported.extra, undefined);
});

test('parseActionCommand resolves by name, id, and unique id prefix', () => {
  const actions = [
    { id: 'code-review-ab12cd', name: '代码审查' },
    { id: 'commit-msg-ef34ab', name: 'Commit Message' },
  ];
  const byName = parseActionCommand(actions, '代码审查 重点看网络层');
  assert.equal(byName.action.name, '代码审查');
  assert.equal(byName.args, '重点看网络层');

  const byCaseInsensitiveName = parseActionCommand(actions, 'commit message');
  assert.equal(byCaseInsensitiveName.action.id, 'commit-msg-ef34ab');

  const byPrefix = parseActionCommand(actions, 'code-review');
  assert.equal(byPrefix.action.name, '代码审查');

  assert.equal(parseActionCommand(actions, '').action, undefined);
  assert.equal(parseActionCommand(actions, '').error, '');
  assert.match(parseActionCommand(actions, 'missing').error, /没有找到/);
});

test('parseActionCommand refuses ambiguous matches', () => {
  const actions = [
    { id: 'dup-aaa111', name: 'Dup' },
    { id: 'dup-bbb222', name: 'Dup' },
  ];
  assert.match(parseActionCommand(actions, 'dup').error, /多个同名/);
  const prefix = parseActionCommand([
    { id: 'same-aaa111', name: 'One' },
    { id: 'same-bbb222', name: 'Two' },
  ], 'same');
  assert.match(prefix.error, /多个 Action/);
});

test('planActionSkills mints stable, unique, kebab-case handles', () => {
  const first = planActionSkills([{ id: 'a', name: '代码审查' }, { id: 'b', name: 'Code Review' }]);
  assert.equal(first.entries.length, 2);
  for (const entry of first.entries) assert.match(entry.name, /^ah-[0-9a-f]{10}$/u);
  assert.notEqual(first.entries[0].name, first.entries[1].name);
  assert.equal(new Set(first.handles.values()).size, 2);
  const renamed = planActionSkills([{ id: 'a', name: 'Renamed entirely' }]);
  assert.equal(renamed.handles.get('a'), first.handles.get('a'));
});
