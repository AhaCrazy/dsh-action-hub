import assert from 'node:assert/strict';
import test from 'node:test';

import { internals } from '../index.js';

const { originAllowed, planActionRefs, referencedActions, actionInvocationMessage } = internals;

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

test('planActionRefs mints stable, unique, opaque handles', () => {
  const first = planActionRefs([{ id: 'a', name: '代码审查' }, { id: 'b', name: 'Code Review' }]);
  assert.equal(first.entries.length, 2);
  for (const entry of first.entries) assert.match(entry.name, /^ah-[0-9a-f]{10}$/u);
  assert.notEqual(first.entries[0].name, first.entries[1].name);
  assert.equal(new Set(first.handles.values()).size, 2);
  const renamed = planActionRefs([{ id: 'a', name: 'Renamed entirely' }]);
  assert.equal(renamed.handles.get('a'), first.handles.get('a'));
});

test('referencedActions only scans direct user text and known markers', () => {
  const known = new Set(['ah-0123456789', 'ah-abcdefabcdef']);
  const messages = [
    { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'please /ah-0123456789 now' }] },
    { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'again /ah-0123456789' }] },
    { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'unknown /ah-ffffffffffff' }] },
    { role: 'user', source: { kind: 'skill-invocation' }, content: [{ type: 'text', text: '/ah-abcdefabcdef' }] },
    { role: 'assistant', source: { kind: 'model' }, content: [{ type: 'text', text: '/ah-abcdefabcdef' }] },
  ];
  assert.deepEqual(referencedActions(messages, known), ['ah-0123456789']);
  assert.deepEqual(referencedActions([
    { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '/ah-0123456789再测试一下' }] },
  ], known), ['ah-0123456789']);
});

test('actionInvocationMessage wraps the body with the Action name', () => {
  const message = actionInvocationMessage({ name: '代码审查', prompt: 'body\n{{args}}' });
  assert.equal(message.role, 'user');
  assert.equal(message.source.kind, 'action');
  assert.match(message.content[0].text, /^<action_content name="代码审查">/u);
  assert.match(message.content[0].text, /body/u);
  assert.match(message.content[0].text, /<\/action_content>$/u);
});

test('actionInvocationMessage inlines small resources and lists large paths', () => {
  const message = actionInvocationMessage({ name: 'Deploy', prompt: 'run it' }, {
    basePath: '/data/resources/x',
    files: [
      { name: 'deploy.py', bytes: 5, text: 'print\n' },
      { name: 'big.bin', bytes: 9000, path: '/data/resources/x/big.bin' },
    ],
  });
  const text = message.content[0].text;
  assert.match(text, /<action_resources base="\/data\/resources\/x">/u);
  assert.match(text, /<action_file name="deploy.py">\nprint\n\n<\/action_file>/u);
  assert.match(text, /<action_file name="big.bin" path="\/data\/resources\/x\/big.bin" bytes="9000"\/>/u);
  assert.match(text, /<action_instructions>\nrun it\n<\/action_instructions>/u);
});
