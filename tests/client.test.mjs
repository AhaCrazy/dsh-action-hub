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

test('client registers under the package name with the expected slots', () => {
  assert.equal(registration.id, 'dsh-action-hub');
  assert.equal(module.name, 'dsh-action-hub');
  assert.deepEqual(module.inject, ['slots', 'locale']);
  assert.equal(typeof module.apply, 'function');
  assert.match(source, /ctx\.slots\.inject\('main'/);
  assert.match(source, /'sidebar\.panellist'/);
  assert.match(source, /'conversation\.composer\.dock'/);
  assert.match(source, /inputActions\.setDraft/);
});

test('the client half never registers a tool or prompt section', () => {
  assert.equal(source.includes('ctx.tools'), false);
  assert.equal(source.includes('systemPrompt'), false);
  assert.equal(source.includes('agent.inject'), false);
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

test('matches and sortActions mirror the store behaviour', () => {
  const { matches, sortActions } = module.internals;
  const action = { name: 'Review', description: 'diff', category: 'dev', tags: ['git'], prompt: 'inspect' };
  assert.equal(matches(action, 'git'), true);
  assert.equal(matches(action, 'nope'), false);
  assert.deepEqual(
    sortActions([
      { name: 'b', usage: { lastAt: 0 } },
      { name: 'a', usage: { lastAt: 9 } },
    ]).map((entry) => entry.name),
    ['a', 'b'],
  );
});

test('relativeTime renders a non-empty label for a past timestamp', () => {
  const { relativeTime } = module.internals;
  assert.notEqual(relativeTime(Date.now() - 5_000), '');
  assert.equal(relativeTime(0), '');
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
