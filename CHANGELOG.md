# Changelog

## 1.2.0 — 2026-10-22

- **Action references no longer register Skills.** 1.1.0 implemented name-only
  references by mirroring every Action into a user-invocable runtime Skill, which
  made them show up in the Skills catalog, the `/` menu, and the context panel.
  The Host now expands a `/ah-…` marker itself at `agent/pre-step` and appends an
  `<action_content>` message for that step; nothing is added to the skill registry,
  so the Skills list and `/` menu contain only real Skills again. The durable log
  keeps the marker, so the transcript still shows only the Action name.
- **Unchanged.** Zero tool, zero prompt section, zero skill-catalog cost; arguments
  still insert the full body, and the rest of the palette/library/settings work is
  untouched.

## 1.1.0 — 2026-10-22

- **Action references.** Picking an Action now inserts it like a Skill: the composer
  sends `/ah-…` and the transcript shows a chip with the Action's own name, while the
  model receives the full body through DSH's existing user-invoked skill injection.
  Actions with filled arguments still insert as full text, because arguments are part
  of the body.
- **Shortcut, properly registered.** The palette shortcut now lives in the Harness
  shortcut registry, appears under Settings → General → Shortcuts, and can be rebound
  there. The default moves to `Ctrl/⌘ + Shift + .` so it no longer collides with the
  browser's *Search tabs* (`Ctrl+Shift+A`). A local listener remains as a fallback
  when the registry is unavailable.
- **Safe category deletion.** Deleting a category now asks for confirmation and says
  how many Actions will move to Uncategorized; the Actions themselves are kept.
- **Zero context unchanged.** The runtime skills behind references are registered with
  `modelInvocable: false`; they never join the model's skill catalog or system prompt.

## 1.0.1 — 2026-10-22

- **Dark theme fix.** Primary buttons and checked switches now use the theme's
  inverse text token instead of a hard-coded white, so the palette stays readable
  on dark themes. Verified in the live Web UI in both themes.

## 1.0.0 — 2026-10-22

Product rebuild and first public release.

- **Spotlight palette.** `Ctrl/⌘ + Shift + A` or the composer-toolbar button opens a
  centered palette: search, category chips, live preview, argument field, and full
  keyboard control (`↑↓`, `Enter` insert, `Ctrl/⌘+Enter` insert-and-send, `Esc` close).
- **Insert at the caret.** Uses the host `inputActions.captureInsertion()` /
  `insertText()` facade, so the Action lands at the cursor as one undoable edit
  instead of replacing the draft; `setDraft` remains as a fallback.
- **Capture the current draft.** Save the composer draft as an Action from inside
  the palette, with name, category, and tags.
- **Pinned Actions.** Star an Action in the palette or library to keep it first.
- **Redesigned library.** Category navigation with counts, full-text search with
  ranking, sort by recent / name / created, row hover actions, and a detail view
  with copy / edit / delete.
- **Settings section.** Settings → Action Hub: close-after-insert, composer button,
  global shortcut toggle, data location, and export.
- **Skill import.** Turn a discovered Skill (`SKILL.md`) into an Action, keeping
  the original name, description, and body.
- **Import / export.** Whole-library JSON with merge or replace, including pinned
  state; usage counters stay local.
- **Host.** Same-origin `/api/dsh-action-hub` routes, atomic JSON store, and a
  `/action <name> [args]` human command that submits a genuine user turn.
- **Product polish.** Bilingual UI, theme-token styling, keyboard-accessible
  controls, empty states, and a display-path (`~/.dsh/...`) that avoids leaking the
  account name.

## 0.1.0 — 2026-10-22

- Initial prototype: sidebar management page, composer-dock popover, categories,
  search, Skill import, import/export, and the `/action` command.
