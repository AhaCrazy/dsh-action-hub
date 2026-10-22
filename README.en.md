# dsh-action-hub · Action Shelf

> Keep reusable prompts and flows as **Actions**: no context cost, never triggered automatically, one click away under the composer.

English | [中文](README.md)

---

## Why this plugin

Turning recurring prompts into Skills has two problems:

1. **Skills cost context all the time.** Every Skill's name and description enter the system prompt, so a large collection taxes every ordinary chat.
2. **Skills trigger themselves.** The agent decides when to call one. For flows like "push this branch through git-svn" you want to run it *only when you decide to*, and you may not want the agent to reach for it at all.

The Action shelf separates those concerns:

- **No context injection.** The plugin registers no agent tool and adds no system-prompt text. Actions live only in a local collection.
- **User-triggered only.** The management page handles CRUD and search; at call time you click one chip under the composer, the body is inserted into the draft, and *you* press Enter.
- **Organized and shareable.** Categories, tags, full-text search, argument placeholders, one-click import from an existing Skill, and whole-library export/import.

## Features

| Feature | Details |
| --- | --- |
| Sidebar page | Create / edit / duplicate / delete, filter by category, full-text search over name, description, category, tags, and body |
| Composer launcher | `Actions · N` under any session composer: search, category filter, argument field, click to insert |
| Argument slots | `{{args}}` / `$ARGUMENTS` are filled from the popover's argument field; `{{date}}` becomes today's date |
| Append, not overwrite | An existing draft is preserved; the Action body is appended, then you press Enter |
| Skill import | "Import → From Skill" lists discoverable Skills for a project directory and turns one into an Action (body = SKILL.md) |
| Sharing | Export the library as JSON; import it elsewhere with merge or replace |
| Slash command | `/action <name> [args]` runs one Action, or lists all names when called without arguments |
| Starter Actions | Three examples are written on a fresh install (code review / commit message / session summary); disable with `seed: false` |

## Install

This is a **DSH bundle** (Host half + Web Client half, no build step, no runtime dependencies).

### Option A — through the DSH agent (recommended)

Ask the agent in DSH to install the bundle through the plugin manager:

```text
plugin_manager({ action: "install_bundle", target: "C:\\path\\to\\dsh-action-hub" })
```

After `application: "applied"`, an `Actions` icon appears in the sidebar. If the page does not update, reload the DSH Web page.

### Option B — wire it into a profile manually

Place the package in your personal plugin directory (e.g. `~/Documents/dsh-plugins/dsh-action-hub`), then add it to the profile's dependencies and bundle list. This is an advanced path; prefer Option A.

## Usage

### Management page

- Click `Actions` in the sidebar.
- "New Action" takes a name, category, tags, description, argument hint, and prompt body.
- Each card can copy the body, edit, duplicate, or delete; the header imports, exports, and refreshes.
- Categories are free text and summarized automatically; "Categories" renames or deletes one (deleting a category moves its Actions to Uncategorized).

### Calling from a conversation

`Actions · N` appears under the composer:

1. Open the popover and optionally fill the argument field.
2. Click an Action: its body is **appended** to the current draft and the popover confirms "inserted; press Enter to send".
3. Review or edit, then send with Enter.

An Action reaches the model only when you use it, and only after your confirmation.

### Slash command

```text
/action                # list every Action
/action code-review    # run it
/action code-review focus on the network layer
```

The command submits the body as a genuine user message to the current session (the same effect as typing it), so normal conversation history is kept.

### Import from a Skill

"Import → From Skill":

- Leave the project directory empty to scan the profile's default working directory; project-level Skills (`.agents/skills`, `.dsh/skills`) need the project root.
- The list shows discoverable Skills; "Import as Action" stores the SKILL.md body as an Action in the "Imported" category with a `skill` tag.

## Data and privacy

- Data lives in `$DSH_HOME/action-hub/actions.json` (default `~/.dsh/action-hub/actions.json`).
- Writes are atomic (temporary file + rename), so a crash cannot truncate the collection.
- Exports contain bodies, categories, and tags but no local usage counters; check a body for internal information before sharing.
- The plugin makes no network requests other than same-origin calls from the page to the local DSH Host under `/api/dsh-action-hub`.

## Design notes

- **Host half** (`index.js`, `store.js`): owns the JSON collection, registers the same-origin `/api/dsh-action-hub` routes (`state`, `create`, `update`, `delete`, `duplicate`, `touch`, `import`, `export`, `skills`, `import-skill`, `category/*`), and registers the `/action` command when the `commands` service exists. The command submits a `source.kind = 'user'` message through `sessionController.prompt(..., mode: 'queue')`.
- **Client half** (`client.js`): registers the `main` page, the `sidebar.panellist` icon, and the `conversation.composer.dock` launcher. Insertion uses the host-provided `inputActions.setDraft()`, so it does not depend on editor internals.
- **Deliberately absent**: no `ctx.tools` registration, no `systemPrompt.section()`, no `agent/pre-step` listener. A large shelf never grows the per-turn prompt.

## Compatibility

- Targets the DSH desktop / Web UI (0.2.x; the plugin API is still in preview).
- The page and launcher require the Host `webServer` service; the slash command additionally needs `commands` and `sessionController` and degrades safely when they are absent.
- After changing plugin files, the browser needs a reload (or HMR) to pick up `client.js`; Host changes require reloading the bundle.

## Development

```powershell
node --check index.js
node --check client.js
node --check store.js
npm test
```

- `tests/store.test.mjs` — data model, placeholders, import merging, atomic persistence.
- `tests/client.test.mjs` — captures the `window.__ModuleLoader__` registration, checks pure helpers and locale completeness, and asserts no tool/prompt surface.
- `tests/host.test.mjs` — same-origin check, export trimming, `/action` argument parsing.

## License

MIT © 2026 AhaCrazy
