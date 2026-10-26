# Action Hub

**A standard Agent Skill library for DSH: one `SKILL.md` can be a model-invocable Skill or a user-only Command.**

This README uses **Action** as the umbrella term for a Skill or a Command. Availability decides where an Action can be seen and invoked; it is never written into `SKILL.md`.

[中文](README.md) · [Changelog](CHANGELOG.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-8.7.0-green.svg)](CHANGELOG.md)
[![dsh](https://img.shields.io/badge/dsh-0.2.x-4f46e5.svg)](package.json)

## Principles

- **The file is the standard**: one directory per entry with `SKILL.md` plus resources. No `action.json`, no plugin-private fields inside the document.
- **Mode is local**: Command / Skill are two local ways to use the same file; switching never edits or copies the body.
- **Commands cost zero context**: not registered for the model, invoked only by you from the palette.
- **Skills are explicit**: enter the model catalog only after you switch them on; cost is shown at switch time.
- **Project scope**: an entry can be limited to selected projects. Scope is local and never exported.
- **Global groups**: mark any group as shared by every workspace; new workspaces inherit it without configuration.
- **Works out of the box**: a fresh install includes a global `Common` group with the built-in `skill-import-assistant` already in it.
- **Per-project blocks**: a project can block inherited groups or Actions without affecting other workspaces.
- **Zero-conversion import**: import a downloaded SKILL.md directory/ZIP as-is; export the same standard directory.

## Usage

### Palette

`Alt + A` (macOS `⌥ + A`) or the composer button:

- Search by name, description, tags, body;
- Each row shows `[Command]` / `[Skill]` and its scope;
- Command: inserts a reference chip without arguments, or the expanded body with arguments;
- Skill: inserts the skill body; the agent can still invoke it, but Action Hub entries stay out of the `/` menu;
- `Enter` / `Tab` inserts, `Ctrl/⌘ + Enter` sends.

### Library

`Ctrl + Alt + A` (macOS `⌘ + ⌥ + A`) or the management page:

- Create/edit standard skills (`name` must be kebab-case);
- Switch Command / Skill;
- Set “all projects” or selected projects;
- Import folder/ZIP, export one or the whole library.

### Import any standard skill

The directory must contain `SKILL.md`:

```text
my-skill/
  SKILL.md
  ...resources
```

```markdown
---
name: my-skill
description: One sentence describing when to use it
---

Body...
```

In the import preview, each new Action can be imported as a **new Command** or a **new Skill**; Command is the default. Choosing Skill makes it model-invocable, with the context cost shown first. Existing local copies can still be updated or skipped.

## Data

```text
~/.dsh/dsh-action-hub/
  library/<skill-name>/
    SKILL.md       # the single standard source
    ...resources
  state.json       # local mode / scope / category / pin / usage / global groups / project blocks
```

- No `action.json`;
- Upgrading from 5.x archives the old `actions/` directory to `backup-v5-test-*` and starts empty; no migration compatibility;
- Shared packages contain only standard skill directories, never `state.json`, so mode/scope/category do not travel with the package.

## Groups and project scopes

- An Action may belong to several groups (for example Common, AgilityDog, Drama);
- The group dialog can tick the Actions in that group directly, without editing each Action;
- Groups can include other groups (for example Art includes Figma) and inherit all their Actions; cycles resolve to one merged set;
- A project selects groups and can add individual Actions;
- New Actions start in no group and must be added manually; right-click any group to make it the new-workspace default group;
- Any group can be marked Global: its Actions, including nested groups, apply to every workspace without per-project configuration, and newly created workspaces get them automatically;
- A project can block inherited groups or Actions (grey cross) without unsetting the global group; direct selections override the block;
- A new or unconfigured project defaults to the configured new-workspace default group; with none configured, no groups are available;
- The palette detects the current project and dims Actions unavailable there;
- A session opened in a project sub-directory matches the nearest registered project root;
- The provider, Command injection, and palette share one availability check;
- Unknown projects or corrupt state fall back to the configured new-workspace default group; with none configured, only built-in Actions are available.

### Global groups

In **Action groups**, right-click any group and choose **Make available in all workspaces**. A **Global** badge appears next to the name.

On a fresh install (no previous `state.json`), the plugin creates a global **Common** group containing the built-in `skill-import-assistant`, so new workspaces can use it without any configuration. Existing `state.json` files are never rewritten automatically.

- Every Action in the group and its nested groups becomes available to every workspace;
- New and unconfigured workspaces inherit it automatically — no per-project setup;
- Choose **Stop using in all workspaces** from the same menu to undo it;
- Projects can still add their own groups and Actions; a global group is a baseline grant, not an exclusive scope.

### Per-project blocks

In **Project scope**, groups and Actions have three states:

| State | Meaning | Click result |
| --- | --- | --- |
| Blue check | Directly selected by this project | Remove the direct selection |
| Grey check | Available through a global/parent group | Block it in this project (grey cross) |
| Grey cross | Blocked in this project | Restore the inherited grant |

Rules:

- Blocking a group blocks it and its nested groups;
- Blocking an Action affects only that Action;
- Direct selections override blocks: after blocking a global group, a project can re-enable one nested group or Action by selecting it directly;
- To block a group that is directly selected, first clear its blue check, then turn its grey check into a grey cross;
- Built-in Actions are baseline grants and stay available by default. To exclude one, turn its own row into a grey cross; group-level blocks do not remove a built-in Action's baseline grant.

Precedence, highest first:

1. An Action directly selected by the project;
2. A group directly selected by the project, including its nested groups;
3. Grants inherited from global or parent groups;
4. Per-project blocks.

Example: mark `Common` global, then block `Common` in `P2`. P2 no longer sees Common Actions while other workspaces are unaffected. To restore just one Action in P2, select that Action directly in P2's list.

## Development

```bash
npm install
npm test
```

The client is generated from `src/client/*.js` into `client.js`; Host entry is `index.js`, standard document parsing is `skill-doc.js`.

## Limits

- The native `/` menu searches ASCII names; use the Action palette for Chinese search;
- Skill catalog changes append a full replacement directory; watch the cost notice;
- No agent/preset-level scope in this version.
