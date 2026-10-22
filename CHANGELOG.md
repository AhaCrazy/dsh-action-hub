# Changelog

## 5.1.1 — 2026-10-22

- **Removed the “复制一份” Action duplication feature** (list button, client
  handler, `/duplicate` Host route, and the now-unused resource-copy helpers).
  Existing duplicates are left untouched.

## 5.1.0 — 2026-10-22

- **Idempotent, previewed bundle import.** Importing a folder/ZIP now runs a
  preflight and shows a preview with a content fingerprint per Action:
  - identical content is marked duplicate and skipped by default;
  - same-id content changes are updatable when the local copy was untouched
    since its last import;
  - locally modified copies are conflicts and are kept by default;
  - each preview row can choose skip / import as new / update before confirming.
  Repeatedly importing the same ZIP no longer adds copies. The import toast
  reports imported / updated / skipped / duplicate / conflict counts.

## 5.0.13 — 2026-10-22

- Moved both shortcut bindings into a dedicated “快捷键” card in Action Hub
  settings (palette + library together) and removed the “默认 …” text from the
  descriptions; each row now shows only the currently effective key.

## 5.0.12 — 2026-10-22

- Removed the “（默认 …）” suffix from the shortcut labels; the defaults remain
  documented in the Action Hub settings page.

## 5.0.11 — 2026-10-22

- **Focus returns to the composer after inserting an Action.** Closing the
  palette now refocuses the Lexical composer and places the caret at the end of
  the current draft, so typing can continue immediately after an inserted
  Action or reference chip.

## 5.0.10 — 2026-10-22

- Restored an `Action Hub:` prefix on both shortcut labels as the practical
  alternative to DSH's fixed shortcut groups.

## 5.0.9 — 2026-10-22

- Removed the `Action Hub ·` label prefix; the plugin settings page now explains
  why DSH's fixed shortcut groups leave plugin entries under “Application”.
  DSH 0.2.1's shortcut UI hardcodes the four groups and forces every editable
  plugin command into `application`, so a real “Action Hub” section there needs
  a DSH host change rather than a plugin-only one.

## 5.0.8 — 2026-10-22

- **Sidebar entry toggle.** Action Hub settings now has “在侧边栏显示 Actions 入口”,
  which immediately hides/shows the sidebar entry (the composer button and
  shortcuts still work).
- **Library shortcut default changed to `Ctrl + Alt + A`** (macOS
  `⌘ + ⌥ + A`); it remains rebindable in Settings → General → Shortcuts. On Web
  the plugin handles the default directly until a DSH binding is assigned.

## 5.0.7 — 2026-10-22

- **Plugin shortcuts are grouped where possible.** The Action Hub settings page
  now lists both the palette and library bindings together with their current
  keys, and the registered command labels are prefixed with `Action Hub ·` so
  they are identifiable in the shortcut list. DSH's shortcut dialog currently
  forces every plugin command into the “Application” group (there is no plugin
  group API), so the entries remain under 应用操作 while editing still happens
  in Settings → General → Shortcuts.

## 5.0.6 — 2026-10-22

- **Removed “Save current draft”** from the palette; the composer-draft capture
  mode and its empty-state entry are gone.
- **The library is now keyboard-accessible.** `Ctrl + Alt + M`
  (`⌘ + ⌥ + M` on macOS) opens the Actions library from the palette or any page,
  and the palette footer shows the current binding. It is registered as its own
  DSH command, so it can be rebound in Settings → General → Shortcuts.

## 5.0.5 — 2026-10-22

- **Fixed the `/` menu losing skills and showing stuck skeleton rows.** The
  Action reference source's `candidates` callback returned a plain array, but
  the input-trigger pipeline calls `.then()` on it. That synchronous throw
  aborted the fetch loop before the commands/context/skills sources ran, so
  their groups stayed pending forever. It now returns `Promise.resolve([])`;
  the slash menu shows commands, context, and all skills again, and the Action
  reference codec still works.

## 5.0.4 — 2026-10-22

- **Palette is a little larger** (up to 940×720 instead of 820×620).
- **Footer reflowed:** the argument box and the action buttons now share one
  row, with the keyboard hints on a separate line at the very bottom.

## 5.0.3 — 2026-10-22

- **Data directory renamed** to `~/.dsh/dsh-action-hub` (and under `$DSH_HOME`).
  The old `~/.dsh/action-hub` directory is renamed automatically on first start;
  an existing custom `dataDir` is never moved.
- **← / → switch groups in the palette.** The group (category) chips can now be
  traversed with the left/right arrows while the palette is open; `←` from
  “全部” wraps to the last group and `→` wraps back. Tab still works too, and the
  arrow hint is shown in the footer. Arrows inside the argument input still move
  the caret.

## 5.0.2 — 2026-10-22

- **Shortcut configuration is back in the standard place.** The command is
  registered with DSH, so **设置 → 通用设置 → 快捷键** lists “打开 Actions
  面板” and can assign/reset a binding there. On Web the registry rejects
  `Alt + A` as a default, so the command starts unbound and the plugin handles
  `Alt + A` directly; as soon as you assign a binding in DSH, the registry takes
  over and the plugin's Alt+A fallback stops. Resetting the DSH binding brings
  the `Alt + A` fallback back. The plugin settings page now only points at that
  screen (no duplicate recorder).

## 5.0.1 — 2026-10-22

- **The shortcut is configurable again.** `Alt + A` remains only the default.
  The plugin settings now have a recorder: click “Change”, press any chord that
  includes Ctrl/Alt/⌘, and it is stored locally; Esc cancels and “Reset”
  restores `Alt + A`. The DSH Web shortcut registry cannot host `Alt + A`
  (single-modifier chords are rejected there), so this configuration lives in
  the plugin rather than 设置 → 通用设置 → 快捷键.

## 5.0.0 — 2026-10-22

- **Import/export are the only primitives.** The bespoke “recognize Skills by
  name / pick a Skill folder / AI import” flows are gone. The library now ships
  one built-in Action, **“Action 导入助手”**, that converts a Skill directory or
  a piece of text into a portable Action bundle; you then import that bundle.
- **Selection-aware export.** The library header “Export” now opens a checklist
  (all Actions selected by default) and exports exactly the ticked Actions as a
  ZIP; the detail view keeps a single **Export ZIP** action (the duplicate
  “export to folder” entry is gone).
- **Resources are managed in the file browser.** The editor now shows a
  read-only directory tree of the Action's `files/`; there is no upload or delete
  button. New Actions are plain text — add attachments under
  `~/.dsh/action-hub/actions/<id>/files/` and refresh the library. The store
  reads `files/` as the source of truth, so externally added files appear in the
  tree, the invocation context, and bundles.
- Legacy JSON import remains available for compatibility; Skill-name import was
  removed from the Host API as well.
- Default shortcut stays **Alt + A** (handled by the plugin on Web where the DSH
  shortcut registry rejects single-modifier chords).

## 4.0.1 — 2026-10-22

- Default palette shortcut is now **Alt + A** (macOS `⌥ + A`) instead of
  `Ctrl/⌘ + Shift + .`; the manual fallback listener and settings display follow
  the same chord. It remains rebindable under Settings → General → Shortcuts.

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
