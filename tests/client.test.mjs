import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * The client bundle is a plain browser script (`window.__ModuleLoader__.load`),
 * not an ES module, so the test captures the registration, runs the factory with
 * a React stub, and asserts the pure helpers plus the no-model-surface promises.
 */
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

const ReactStub = {
  createElement: (...args) => args,
  memo: (component) => component,
  useRef: (value) => ({ current: value }),
  useEffect: () => {},
  useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
  useMemo: (factory) => factory(),
  useCallback: (callback) => callback,
};

let registration = null;
const windowStub = {
  __ModuleLoader__: {
    load(definition) {
      registration = definition;
    },
  },
};
new Function('window', source)(windowStub);

const module = registration === null
  ? null
  : registration.factory((id) => {
    if (id === 'react') return ReactStub;
    throw new Error(`unexpected module request: ${id}`);
  });

test('client registers under the package name with every product surface', () => {
  assert.equal(registration.id, 'dsh-action-hub');
  assert.equal(module.name, 'dsh-action-hub');
  assert.deepEqual(module.inject, ['slots', 'locale']);
  assert.equal(typeof module.apply, 'function');
  assert.match(source, /ctx\.slots\.inject\('main'/);
  assert.match(source, /'sidebar\.panellist'/);
  assert.match(source, /'conversation\.input\.left'/);
  assert.match(source, /'conversation\.input\.overlay'/);
  assert.match(source, /'shell\.overlay'/);
  assert.match(source, /'settings\.section'/);
  assert.match(source, /captureInsertion/);
  assert.match(source, /insertText/);
  assert.match(source, /keydown/);
});

test('the client half never registers a tool or prompt section', () => {
  assert.equal(source.includes('ctx.tools'), false);
  assert.equal(source.includes('systemPrompt'), false);
  assert.equal(source.includes('agent.inject'), false);
});

test('references ride the registry shortcut and the user-text chip path', () => {
  assert.match(source, /ctx\.get\('shortcuts'\)/);
  assert.match(source, /service\.register/);
  assert.match(source, /code: 'Period'/);
  assert.match(source, /userText\.register/);
  assert.match(source, /'conversation\.user\.text\.node'/);
});

test('expandPrompt matches the Host helper semantics', () => {
  const { expandPrompt } = module.internals;
  assert.equal(expandPrompt('a {{args}} b', { args: 'X' }), 'a X b');
  assert.equal(expandPrompt('no slot', { args: 'tail' }), 'no slot\n\ntail');
  assert.equal(expandPrompt('no args', { args: '' }), 'no args');
  assert.equal(expandPrompt('{{date}}', { date: new Date(2026, 9, 22) }), '2026-10-22');
  assert.equal(expandPrompt('body\n\n{{args}}', { args: '' }), 'body');
  assert.equal(expandPrompt('body\n\n{{args}}', { args: 'x' }), 'body\n\nx');
});

test('composeDraft appends instead of destroying the current draft', () => {
  const { composeDraft } = module.internals;
  assert.equal(composeDraft('', 'prompt'), 'prompt');
  assert.equal(composeDraft('typed', 'prompt'), 'typed\n\nprompt');
  assert.equal(composeDraft('typed  \n', 'prompt'), 'typed\n\nprompt');
  assert.equal(composeDraft('typed', ''), 'typed');
});

test('composeReferenceDraft inserts a chip at the caret and keeps offsets', () => {
  const { composeReferenceDraft } = module.internals;
  const plain = composeReferenceDraft({
    draft: 'hello world',
    span: { start: 5, end: 5 },
    occurrences: [],
    marker: '/ah-0123456789',
    label: '代码审查',
  });
  assert.equal(plain.text, 'hello /ah-0123456789 world');
  assert.equal(plain.references.length, 1);
  assert.equal(plain.references[0].offset, 6);
  assert.equal(plain.references[0].label, '代码审查');
  assert.equal(plain.references[0].clipboardText, '/ah-0123456789');
  const replaced = composeReferenceDraft({
    draft: 'abcXYZdef',
    span: { start: 3, end: 6 },
    occurrences: [],
    marker: '/ah-0123456789',
    label: 'X',
  });
  assert.equal(replaced.text, 'abc /ah-0123456789 def');
  const appended = composeReferenceDraft({
    draft: 'typed /ah-aaaaaaaaaa ',
    span: { start: 99, end: 99 },
    occurrences: [{ source: 'file', ref: '@a', offset: 6, length: 14, label: 'a.ts', clipboardText: '/ah-aaaaaaaaaa', appearance: 'file' }],
    marker: '/ah-0123456789',
    label: '代码审查',
  });
  assert.equal(appended.text, 'typed /ah-aaaaaaaaaa /ah-0123456789');
  assert.equal(appended.references.length, 2);
  assert.equal(appended.references[1].offset, appended.text.length - 14);
  assert.equal(appended.references[0].occurrenceId, undefined);
});

test('searchScore prefers names, requires every token, and rejects misses', () => {
  const { searchScore } = module.internals;
  const action = { name: 'Code Review', description: 'diff reader', category: 'dev', tags: ['git'], prompt: 'inspect changes' };
  assert.ok(searchScore(action, 'code') > 0);
  assert.ok(searchScore(action, 'code') > searchScore(action, 'diff'));
  assert.ok(searchScore(action, 'git dev') > 0);
  assert.equal(searchScore(action, 'code missing'), -1);
  assert.equal(searchScore(action, '  '), 0);
});

test('visibleActions filters, scores, and keeps pinned entries first', () => {
  const { visibleActions } = module.internals;
  const actions = [
    { id: 'a', name: 'Alpha', category: 'dev', pinned: false, prompt: 'x', tags: [], usage: { lastAt: 5 } },
    { id: 'b', name: 'Beta', category: 'dev', pinned: true, prompt: 'y', tags: [], usage: { lastAt: 1 } },
    { id: 'c', name: 'Gamma', category: 'ops', pinned: false, prompt: 'z', tags: [], usage: { lastAt: 9 } },
  ];
  assert.deepEqual(visibleActions(actions).map((entry) => entry.id), ['b', 'c', 'a']);
  assert.deepEqual(visibleActions(actions, { category: 'dev' }).map((entry) => entry.id), ['b', 'a']);
  assert.deepEqual(visibleActions(actions, { uncategorized: true }), []);
  assert.deepEqual(visibleActions(actions, { query: 'gamma' }).map((entry) => entry.id), ['c']);
});

test('sortActions and categoriesOf shape the library', () => {
  const { sortActions, categoriesOf } = module.internals;
  assert.deepEqual(
    sortActions([
      { name: 'b', category: 'x', usage: { lastAt: 0 }, pinned: false },
      { name: 'a', category: 'x', usage: { lastAt: 9 }, pinned: false },
    ]).map((entry) => entry.name),
    ['a', 'b'],
  );
  assert.deepEqual(categoriesOf([
    { category: 'dev' },
    { category: 'dev' },
    { category: 'ops' },
    { category: '' },
  ]), [['dev', 2], ['ops', 1]]);
});

test('matchActionMarker accepts text typed right after the chip', () => {
  const { matchActionMarker } = module.internals;
  const names = new Map([['ah-0123456789', '会话小结']]);
  assert.equal(matchActionMarker('/ah-0123456789再测试一下', 0, names).data.name, '会话小结');
  assert.equal(matchActionMarker('看看 /ah-0123456789', 0, names).start, 3);
  assert.equal(matchActionMarker('/ah-9999999999', 0, names), undefined);
  assert.equal(matchActionMarker('/ah-0123456789abc', 0, names), undefined);
});

test('relativeTime renders a non-empty label for a past timestamp', () => {
  const { relativeTime } = module.internals;
  assert.notEqual(relativeTime(Date.now() - 5_000), '');
  assert.equal(relativeTime(0), '');
});

test('parseSkillDocument reads frontmatter and body from CRLF SKILL.md', () => {
  const { parseSkillDocument } = module.internals;
  const parsed = parseSkillDocument('---\r\nname: grill\r\ndescription: sharpen it\r\n---\r\n\r\nBody here.\r\n');
  assert.equal(parsed.meta.name, 'grill');
  assert.equal(parsed.meta.description, 'sharpen it');
  assert.equal(parsed.body, 'Body here.');
  const plain = parseSkillDocument('no frontmatter');
  assert.deepEqual(plain.meta, {});
  assert.equal(plain.body, 'no frontmatter');
});

test('every locale key exists in both dictionaries', () => {
  const { TEXT } = module.internals;
  const zh = Object.keys(TEXT.zh).sort();
  const en = Object.keys(TEXT.en).sort();
  assert.deepEqual(zh, en);
  for (const key of zh) {
    assert.notEqual(TEXT.zh[key].trim(), '');
    assert.notEqual(TEXT.en[key].trim(), '');
  }
});
