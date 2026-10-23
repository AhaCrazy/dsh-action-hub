import assert from 'node:assert/strict';
import test from 'node:test';

import { clearBuiltinCache, loadBuiltinActions } from '../builtins.js';

test('built-in skills are standard SKILL.md directories', async () => {
  clearBuiltinCache();
  const builtins = await loadBuiltinActions();
  assert.ok(builtins.length >= 1);
  const assistant = builtins.find((entry) => entry.name === 'skill-import-assistant');
  assert.ok(assistant !== undefined);
  assert.equal(assistant.mode, 'command');
  assert.match(assistant.description, /import|导入/u);
  assert.ok(assistant.prompt.length > 0);
});
