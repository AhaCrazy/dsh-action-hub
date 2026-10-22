# Changelog

## 4.0.0 — 2026-10-22

- **One directory per Action.** The store is now:
  `~/.dsh/action-hub/actions/<id>/action.json` + `files/`. An Action is a
  self-contained, human-readable, git-friendly unit; backups only need
  `actions/`, and legacy `actions.json` + `resources/<hash>/` data is migrated
  once (legacy paths are renamed aside, not deleted).
- **Portable bundles.** Export a single Action or the whole library as a ZIP
  (download) or as a folder copy; import a bundle folder or ZIP. Folder import
  accepts one Action directory or a whole library directory. Colliding ids get a
  fresh id, resources travel with the Action, and the bundle format
  `dsh-action-hub/action@1` is documented by `action.json`.
- **Dependency-free ZIP.** A small internal ZIP reader/writer (store/deflate,
  UTF-8 names, no ZIP64) powers sharing without adding runtime dependencies.
- **Crash-safe writes.** Each `action.json` is written temp+rename; deleting an
  Action removes its directory; duplicating copies its resource files.
- Existing JSON export/import remains available for backward compatibility.

## 3.0.0 — 2026-10-22

- **AI-assisted Skill import.** “AI import” opens a fresh conversation with the
  Skill's body, file manifest, and any same-named Skill directories as a brief.
  The model compares the candidates, reads files, asks the user one question at a
  time when Skill/Action differences matter, then writes one JSON package to the
  Action Hub inbox. A Host watcher imports that package (Action + selected
  resources) and removes it — deterministic storage, model-driven conversion.
  If writing the inbox is denied, the brief tells the model to fall back to a
  code block for the regular JSON import.
- Conversion brief encodes the real Skill/Action differences: user-invoked only,
  no Skill registration, independent prompt, `{{args}}` support, and selective
  resource files.
- Same-named candidates are surfaced automatically, so a thin `.agents` shim no
  longer hides a richer `.claude` copy from the model.

## 2.1.0 — 2026-10-22

- **Pick a Skill folder in the import dialog.** The browser folder picker reads
  `SKILL.md` and every sibling file directly, creates the Action, and uploads the
  files as resources. It never asks the DSH Skills service to resolve the name,
  so a same-named `.agents` shim can no longer shadow the rich `.claude` copy.
  This is the recommended import path for Skills that ship extra templates/docs.
- Importing a row from the resolved Skills list now passes that row's concrete
  path, so what the list shows is what gets imported.

## 2.0.1 — 2026-10-22

- **Import a Skill by explicit directory.** DSH may resolve a same-named Skill
  from a different root (for example a thin `.agents/skills/...` shim shadowing
  a richer `.claude/skills/...` copy), so importing by name can pick the wrong
  files. The import dialog now accepts a Skill directory (or `SKILL.md` path)
  and copies its body and sibling resource files directly.
- The Skills list shows each resolved Skill's path, making shadowing visible.

## 2.0.0 — 2026-10-22

- **Actions can carry resource files.** An Action is now a prompt plus an optional
  bundle of local files (code, templates, docs, fixtures). Files are stored under
  `~/.dsh/action-hub/resources/<hashed-id>/`; the management editor can add,
  preview, and delete them (up to 64 files, 4 MB each, 32 MB total).
- **Resource-aware invocation.** When invoked, small text files are inlined into
  the `<action_content>` context, while larger or binary files are listed with a
  local path so the model can read only what it needs. Prompt and resources stay
  out of context until the user explicitly invokes the Action.
- **Skill import brings assets too.** Importing a Skill now copies the files next
  to `SKILL.md` into the new Action's resources and reports how many were taken.
- **Export/import and duplicate cover files.** Whole-library export embeds file
  contents (base64) for sharing; import writes them back; duplicate clones the
  resource directory along with the Action.
- **Existing data stays compatible.** Actions without resources behave exactly as
  before; a missing resources directory simply yields no files.

## 1.3.1 — 2026-10-22

- **Adjacent text still renders as a chip.** Marker detection no longer requires
  whitespace after the handle, so a message like `/ah-…再测试一下` (the user typed
  immediately after the chip) renders as the Action-name chip plus the typed text,
  and the Host still expands the Action body. Existing messages pick this up on
  reload.
- New references now leave a trailing space after the chip, so subsequently typed
  text keeps a word boundary.

## 1.3.0 — 2026-10-22

- **Action name in the composer.** Inserting a reference now creates a real
  composer chip: the input box shows `@代码审查` while the stored draft text stays
  the opaque `/ah-…` marker. A small reference-source codec serializes the chip
  back to that marker on send, so the Host expansion, the transcript chip, and
  zero Skill registration all keep working. Plain drafts insert at the caret;
  drafts that already contain file/session chips append at the end so their
  offsets stay valid.
- **Quieter hot reload.** A duplicate shortcut registration (development HMR)
  reuses the existing registry row instead of logging a warning.

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
