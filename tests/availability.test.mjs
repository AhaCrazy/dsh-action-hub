import assert from 'node:assert/strict';
import test from 'node:test';

import { actionAvailable, profileFor, availableActions } from '../host/availability.js';
import { defaultProjectProfile } from '../store.js';

const actions = [
  { name: 'common-action', groups: ['common'] },
  { name: 'agility-action', groups: ['agility'] },
  { name: 'loose-action', groups: [] },
  { name: 'builtin-action', groups: [], builtin: true },
];

test('project profiles grant Actions through selected groups', () => {
  const profile = { path: 'C:/p', groups: ['agility'], actions: [] };
  assert.deepEqual(availableActions(actions, profile).map((action) => action.name), ['agility-action', 'builtin-action']);
});

test('project profiles can add an individual Action', () => {
  const profile = { path: 'C:/p', groups: [], actions: ['loose-action'] };
  assert.equal(actionAvailable(actions[2], profile), true);
  assert.equal(actionAvailable(actions[1], profile), false);
});

test('an Action with no group is unavailable unless selected', () => {
  assert.equal(actionAvailable(actions[2], defaultProjectProfile('C:/p')), false);
});

test('nested groups contribute their Actions through the selected parent', () => {
  const groups = [
    { id: 'art', includes: ['figma'] },
    { id: 'figma', includes: [] },
  ];
  const nested = [{ name: 'figma-1', groups: ['figma'] }];
  assert.equal(actionAvailable(nested[0], { groups: ['art'], actions: [] }, groups), true);
  assert.equal(actionAvailable(nested[0], { groups: ['common'], actions: [] }, groups), false);
});

test('cycles contribute the union of the connected groups', () => {
  const groups = [
    { id: 'art', includes: ['figma'] },
    { id: 'figma', includes: ['art'] },
  ];
  const cyclic = [{ name: 'figma-1', groups: ['figma'] }, { name: 'art-1', groups: ['art'] }];
  assert.equal(actionAvailable(cyclic[0], { groups: ['art'], actions: [] }, groups), true);
  assert.equal(actionAvailable(cyclic[0], { groups: ['figma'], actions: [] }, groups), true);
  assert.equal(actionAvailable(cyclic[1], { groups: ['figma'], actions: [] }, groups), true);
});

test('unknown projects use the Common default and built-ins stay available', () => {
  const profile = profileFor([], null);
  assert.deepEqual(profile.groups, ['common']);
  assert.equal(actionAvailable(actions[0], profile), true);
  assert.equal(actionAvailable(actions[3], profile), true);
});
