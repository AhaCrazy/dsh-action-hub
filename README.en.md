# Action Hub

**A Spotlight-style Action shelf for DSH: keep reusable prompts and flows one search away, without paying context for them or letting the agent trigger them.**

[涓枃](README.md) 路 [Changelog](CHANGELOG.md) 路 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-1.2.0-green.svg)](CHANGELOG.md)
[![dsh](https://img.shields.io/badge/dsh-0.2.x-4f46e5.svg)](package.json)

![Action Hub palette](assets/screenshots/01-palette.png)

## Why

Turning recurring prompts into Skills has two problems:

1. **They cost context all the time.** Every Skill's name and description enters the system prompt, so a large collection taxes every ordinary chat.
2. **They trigger themselves.** The agent decides when to call one. For flows like "push this branch through git-svn" you want to run it *only when you decide to*, and you may not want the agent to reach for it at all.

Action Hub separates the shelf from the trigger:

- **Zero context cost.** No agent tool, no system-prompt text. A large shelf never grows the per-turn prompt.
- **User-triggered only.** Open the palette with `鈱?Ctrl + Shift + .` or the composer-toolbar button; the pick inserts a reference (the transcript shows the Action name), and pressing Enter sends it yourself.
- **Organized and shareable.** Categories, tags, pinning, full-text search, one-click Skill import, and whole-library export/import.

## Screens

| Palette | Library |
| --- | --- |
| ![Palette](assets/screenshots/01-palette.png) | ![Library](assets/screenshots/02-library.png) |
| Search, categories, live preview, arguments 鈥?fully keyboard-driven | Category navigation, search, sorting, compact rows, detail |

| Action details | Settings |
| --- | --- |
| ![Details](assets/screenshots/03-detail.png) | ![Settings](assets/screenshots/04-settings.png) |
| Full body, tags, usage, copy/edit/delete | Insertion behavior, shortcut, toolbar button, data location |

## Features

| Capability | Details |
| --- | --- |
| Spotlight palette | `鈱?Ctrl+Shift+.` or the composer button; search, category tabs, live preview, argument field |
| Keyboard first | `鈫戔啌` select, `Enter` insert, `Ctrl/鈱?Enter` insert-and-send, `Tab` category, `Esc` close |
| Reference insert | Without arguments it inserts `/ah-鈥: the transcript shows the Action name while the plugin injects the full body when the message is sent. No Skill is registered |
| Rebindable shortcut | Default `Ctrl/鈱?+ Shift + .`, registered under Settings 鈫?General 鈫?Shortcuts |
| Insert at the caret | Uses the host `inputActions.insertText()` facade: one undoable edit at the cursor, existing draft preserved |
| Capture the draft | Save the current composer draft as an Action from the palette |
| Pinning | Star an Action to keep it first in the palette and library |
| Library | Category navigation with counts, full-text search, sort by recent / name / created |
| Arguments | `{{args}}` / `$ARGUMENTS` filled from the palette; `{{date}}` becomes today |
| Skill import | Browse project Skills and import a `SKILL.md` body as an Action |
| Sharing | Export the library as JSON; import with merge or replace; local usage counters stay local |
| Slash command | `/action <name> [args]` runs one Action, or lists them all |

## Install

Action Hub is a DSH bundle (Host half + Web half, no build step, no runtime dependencies).

**From the plugin market** (once listed): DSH 鈫?Plugin Market 鈫?search `Action Hub` 鈫?Install 鈫?Enable.

**From GitHub**:

```sh
dsh plugin --profile desktop add "github:AhaCrazy/dsh-action-hub#main"
```

**From a local checkout**: DSH 鈫?Plugins 鈫?Add plugin 鈫?paste the absolute path of this directory 鈫?Install 鈫?Enable 鈫?reload the page.

After installing, an `Actions` icon appears in the sidebar and an Action Hub button appears at the left of the composer toolbar.

## Usage

### Open the palette

- `Ctrl + Shift + .` (macOS `鈱?+ Shift + .`), or the leftmost icon in the composer toolbar. Rebind it in Settings 鈫?General 鈫?Shortcuts.
- Type to search, `鈫戔啌` to select, `Enter` to insert.

### Insert or send

- `Enter` / 鈥淚nsert鈥? inserts at the **caret** as one undoable edit; the existing draft is kept.
- With no arguments it inserts a **reference**: the transcript shows only the Action name (the `/ah-鈥 marker is just a locator) and the plugin injects the full body when the message is sent.
- With arguments it inserts the **full text**, since the arguments are part of the body.
- `Ctrl/鈱?+ Enter` / 鈥淪end鈥? inserts and submits the current draft.

### Save content

- **Save the current draft**: 鈥淪ave draft鈥?in the palette footer 鈫?name/category/tags 鈫?Save.
- **Import from a Skill**: Library 鈫?Import 鈫?From Skill 鈫?project root (empty scans the default) 鈫?pick a Skill.
- **Create/edit**: 鈥淣ew Action鈥?in the library, or the row's edit button.

### Organize

- Categories are free text, summarized with counts in the sidebar; 鈥淢anage categories鈥?renames or deletes one. Deleting asks for confirmation and reports how many Actions move to Uncategorized; the Actions themselves are kept.
- Pin with the star; search covers name, description, category, tags, and body.
- 鈥淓xport鈥?produces a whole-library JSON; import it elsewhere with merge or replace.

## Design

- **Host half** (`index.js`, `store.js`): atomic JSON store, same-origin `/api/dsh-action-hub` routes, and the `/action` human command, which submits a genuine user message through `sessionController.prompt(..., mode: 'queue')`.
- **References**: the composer inserts an opaque `/ah-鈥 marker; the Host expands it in `agent/pre-step` into one `<action_content>` message for the step. **No runtime Skill is registered**, so Actions never appear in the Skills catalog, the `/` menu, or the context panel's skill list; the durable log keeps the marker, which is why the transcript shows only the Action name.
- **Client half** (`client.js`): registers the composer-toolbar button (`conversation.input.left`), the session bridge (`conversation.input.overlay`), the frame-level palette (`shell.overlay`), the library (`main` + sidebar icon), and the settings page (`settings.section`).
- **Deliberately absent**: no `ctx.tools`, no `ctx.systemPrompt.section()`, no `agent/pre-step` listener. Shelf size does not affect context.

## Data and privacy

- Data lives in `~/.dsh/action-hub/actions.json` (under `$DSH_HOME`) with atomic writes.
- Settings show `~/.dsh/...` rather than an absolute path with the account name.
- The plugin talks only to the local DSH Host (`/api/dsh-action-hub`); it makes no external network requests.
- Exports contain bodies, categories, tags, and pinned state 鈥?not local usage counters. Check a body for internal information before sharing.

## Compatibility

- Targets DSH desktop / Web UI `0.2.x` (the plugin API is still in preview).
- The library and palette need the Host `webServer` service; `/action` additionally needs `commands` and `sessionController` and degrades safely when absent.
- After changing plugin files, reload the page to pick up `client.js`; Host changes require reloading the bundle.

## Development

```powershell
node --check index.js
node --check client.js
node --check store.js
npm test
```

- `tests/store.test.mjs` 鈥?data model, placeholders, pinning order, import merging, atomic persistence.
- `tests/client.test.mjs` 鈥?captures the module registration, checks pure helpers and locale completeness, asserts no tool/prompt surface.
- `tests/host.test.mjs` 鈥?same-origin check, export trimming, `/action` argument parsing.

## License

MIT 漏 2026 AhaCrazy
