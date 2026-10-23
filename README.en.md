# Action Hub

**A standard Agent Skill library for DSH: one `SKILL.md` can be a model-invocable Skill or a user-only Command.**

This README uses **Action** as the umbrella term for a Skill or a Command. Availability decides where an Action can be seen and invoked; it is never written into `SKILL.md`.

[中文](README.md) · [Changelog](CHANGELOG.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-7.9.0-green.svg)](CHANGELOG.md)
[![dsh](https://img.shields.io/badge/dsh-0.2.x-4f46e5.svg)](package.json)

## Principles

- **The file is the standard**: one directory per entry with `SKILL.md` plus resources. No `action.json`, no plugin-private fields inside the document.
- **Mode is local**: Command / Skill are two local ways to use the same file; switching never edits or copies the body.
- **Commands cost zero context**: not registered for the model, invoked only by you from the palette.
- **Skills are explicit**: enter the model catalog only after you switch them on; cost is shown at switch time.
- **Project scope**: an entry can be limited to selected projects. Scope is local and never exported.
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

Imported skills start as **Command**. Switch to **Skill** in the editor before the model can invoke them; the cost is shown first.

## Data

```text
~/.dsh/dsh-action-hub/
  library/<skill-name>/
    SKILL.md       # the single standard source
    ...resources
  state.json       # local mode / scope / category / pin / usage
```

- No `action.json`;
- Upgrading from 5.x archives the old `actions/` directory to `backup-v5-test-*` and starts empty; no migration compatibility;
- Shared packages contain only standard skill directories, never `state.json`, so mode/scope/category do not travel with the package.

## Groups and project scopes

- An Action may belong to several groups (for example Common, AgilityDog, Drama);
- The group dialog can tick the Actions in that group directly, without editing each Action;
- Groups can include other groups (for example Art includes Figma) and inherit all their Actions; cycles resolve to one merged set;
- A project selects groups and can add individual Actions;
- A new or unconfigured project defaults to the **Common** group only;
- The palette detects the current project and dims Actions unavailable there;
- A session opened in a project sub-directory matches the nearest registered project root;
- The provider, Command injection, and palette share one availability check;
- Unknown projects or corrupt state fall back to Common; non-Common Actions stay unavailable.

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
