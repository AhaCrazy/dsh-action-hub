# Changelog

## 8.3.5 — 2026-10-26

- Built-in Actions can now be assigned to groups; memberships persist in
  `state.json` and built-ins are decorated with their saved groups.
- Group dialog placeholder no longer mentions user-specific group names.

## 8.3.4 — 2026-10-26

- When no conversation is retained in the main view (for example while the
  Action Hub panel is open), the palette now falls back to the persisted
  `dsh.sessions.current` selection before the stale composer bridge. This keeps
  the active workspace's project scope instead of another workspace's default.

## 8.3.3 — 2026-10-23

- The palette now resolves availability from the main-view Session snapshot
  (`useSessions` + `retainedBy.mainView`) instead of trusting whichever
  composer bridge updated last. Background sessions can no longer overwrite the
  active project context.

## 8.3.2 — 2026-10-23

- Serialized session-aware `/state` refreshes so an older request without the
  active session can no longer overwrite the newer, session-scoped result. The
  palette also re-applies its bridge session before refreshing.

## 8.3.1 — 2026-10-23

- Availability is now resolved from the current conversation's session cwd
  instead of whichever session was updated last. This fixes the palette hiding
  Actions that were available in the active project but not in a newer session
  from another workspace.

## 8.3.0 — 2026-10-23

- Removed the obsolete built-in Action `action-import-assistant`.
- Added built-in **skill-import-assistant**: it turns prompts, SKILL.md files,
  directories, and ZIPs into standard Agent Skills, then imports them through
  Action Hub's preview/import APIs, handles duplicate/conflict decisions, and
  verifies the imported Action.

## 8.2.1 — 2026-10-23

- The palette sort now offers the same modes as the library: recently used,
  name, recently created, this week, this month, and total uses.

## 8.2.0 — 2026-10-23

- The Action palette now hides Actions that are unavailable in the current
  project, instead of listing them as disabled.
- Added a palette sort mode (recently used / name / total uses) for the
  remaining available Actions.

## 8.1.0 — 2026-10-23

- Replaced the separate export dialog with an inline export mode on the main
  library screen. The header Export button toggles the mode; Action rows gain
  checkboxes and clicking a row selects it. A toolbar selects all visible
  Actions, clears the selection, cancels, or downloads the selected ZIP.

## 8.0.1 — 2026-10-23

- Removed the automatic **未分组 / Ungrouped** group entirely. Initial state now
  has no groups; the user creates their own.
- New Actions start with no group membership. The optional “new-workspace
  default group” remains configurable, but is unset until the user selects one.
- Migration drops the old automated Ungrouped group and clears its references
  from Actions, group includes, and project profiles.

## 8.0.0 — 2026-10-23

- Replaced the built-in **Common** group with **未分组 / Ungrouped**. Existing
  Common data migrates to an ordinary user group named Common; new Actions and
  bundled Actions default to 未分组.
- Unconfigured projects now default to a configurable “new-workspace default
  group” (initially 未分组). Right-click any group and choose “Set as
  new-workspace default” to change it.
- 未分组 cannot be renamed or deleted; another group that is the current
  workspace default must be replaced before it can be deleted.

## 7.10.0 — 2026-10-23

- Added a “Group bar” switch in the library header. It shows or hides a left
  group list; the choice is persisted in local storage.
- Selecting a group filters the library to that group's effective Actions,
  including Actions inherited through nested group references.

## 7.9.1 — 2026-10-23

- Restored separate “分组” and “项目可用范围” entry buttons and dialogs instead
  of the merged bookmark-tab modal.
- Removed the header close X from both configuration dialogs; backdrop click,
  Cancel, and Escape still close them.
- Returned the footer to the normal modal footer, fixing content bleeding
  through the bottom of the merged dialog.

## 7.9.0 — 2026-10-23

- Removed the Action editor UI and the detail-page Edit button. Actions are
  managed as standard SKILL.md files through Import or the filesystem; the new
  Action button is gone too.
- Removed the category sidebar, category management dialog, category/tag badges,
  category/tag search, and category filtering from the library and palette.
  Import/export lists now show Skill/Command instead of category metadata.

## 7.8.1 — 2026-10-23

- Group inclusion rows now use the same three-state check: blue for a direct
  include and grey for a group already reachable through another selected group.
  The per-row “already active” / cycle text badges were removed.

## 7.8.0 — 2026-10-23

- Introduced a three-state checkbox for Actions in both the group and project
  editors: unchecked (not included), blue check (directly selected), and grey
  check (inherited from another group). Clicking toggles the direct selection,
  so a grey check becomes blue and a blue check falls back to grey when the
  Action is still covered by a group.

## 7.7.1 — 2026-10-23

- Removed the remaining checkbox placeholder from project Actions covered by a
  group; covered rows now have no checkbox at all.
- Moved transient library notices to a fixed bottom toast so success/error
  messages no longer push the main content down.

## 7.7.0 — 2026-10-23

- Moved Action row Edit/Delete out of the inline trailing controls into a
  right-click context menu, and added a “Switch to Skill/Command” item based on
  the Action's current mode.
- Project availability rows covered by a selected group no longer render a
  checkbox; the row, type badge, and “Covered by a group” state remain.

## 7.6.1 — 2026-10-23

- Moved the merged configuration tabs into the modal header as bookmark-style
  tabs, so they appear exactly where the old dialog title/toolbar entry lived.

## 7.6.0 — 2026-10-23

- Merged the group editor and project availability editor into one dialog with
  bookmark-style tabs. Both panels stay mounted while switching tabs, so
  unsaved drafts are preserved; closing asks once for the combined dirty count.
- Each toolbar entry opens the merged dialog on its matching tab, and panel
  saves no longer close the dialog.

## 7.5.0 — 2026-10-23

- Redesigned the project availability dialog as a two-pane editor: project list
  on the left, selected project's groups and extra Actions on the right.
- Project edits are drafted per project and saved together; closing with unsaved
  changes asks for confirmation.
- The project pane shows indirectly active groups, covered Actions, per-group
  Action counts, and the shared wide modal layout.

## 7.4.2 — 2026-10-23

- Groups already reachable through the current includes (including cycles) are
  now shown as “Already active” with a dashed highlighted row, even when their
  checkbox is not selected, so indirect coverage is visible before saving.

## 7.4.1 — 2026-10-23

- Group Action rows now show only the Skill/Command badge on the right. Group
  badges were removed; hovering an Action inherited from another group shows a
  tooltip naming the groups that directly contain it.

## 7.4.0 — 2026-10-23

- Group cycles are now allowed instead of rejected. A cycle is treated as one
  shared Action pool: every group in the cycle resolves to the union of the
  connected groups' Actions. The group editor shows a non-blocking cycle hint,
  and all recursive traversals use visited sets so there is no infinite loop.
- Removed the Host-side cycle rejection and the read-time cycle-edge pruning.

## 7.3.5 — 2026-10-23

- Fix the group editor reporting a just-unchecked directly assigned Action as
  “inherited through a child group”. Effective membership now uses the current
  draft for every group instead of stale saved membership.

## 7.3.4 — 2026-10-23

- Reverted the unselected-group width shrink and removed the inline
  rename/delete buttons from the selected group row. Group rename and delete
  now live in a right-click context menu; Common still has no such menu.

## 7.3.3 — 2026-10-23

- Unselected group rows now shrink to their content instead of spanning the full
  left column; only the selected group expands to full width for its actions.

## 7.3.2 — 2026-10-23

- Only the selected group in the group list gets a card/background; hovering an
  unselected group now highlights just its name, so an unselected row no longer
  looks like a selected full-width card.

## 7.3.1 — 2026-10-23

- Fix the group editor layout: the search field no longer stretches vertically
  inside a column flex container, and the selected group gets a stronger
  active-state accent.

## 7.3.0 — 2026-10-23

- Groups can include other groups. Selecting a parent group grants every Action
  of its descendants through the same availability check.
- The group editor adds an “Includes groups” section with cycle-safe checkboxes,
  effective Action counts, inherited Action badges, and traversal-aware project
  coverage.
- Cycle creation is rejected on the Host and sanitized when state is read;
  deleting a group also removes the reference from parent groups.

## 7.2.0 — 2026-10-23

- Redesigned the group dialog as a two-pane editor: group list on the left,
  searchable Action checklist on the right.
- Group membership changes are drafted locally and saved in one batch; closing
  with unsaved changes asks for confirmation. Common stays fixed and cannot be
  renamed or deleted.
- Added select-all/clear, selected/unselected filters, per-group Action counts,
  inline rename, and a wide modal layout.

## 7.1.0 — 2026-10-23

- The group dialog now lists the Actions in each group directly, with search
  and checkboxes, so membership can be configured from the group side instead
  of editing Actions one by one.
- Added `POST /groups/actions` and `store.setGroupActions()` for bulk group
  membership; existing Action-side group editing remains available.

## 7.0.0 — 2026-10-23

- **Project-centric availability through Action groups.** Actions can belong to
  several groups; a project selects groups plus optional individual Actions.
  Projects without a stored profile default to the Common group.
- The library gains group management and a per-project availability dialog.
  Action editing now assigns groups instead of a per-Action project allowlist.
- `state.json` moves to format `dsh-action-hub/state@2`: `groups`,
  `entries[].groups`, and `projects[]` profiles. Legacy per-Action scopes are
  migrated automatically (global Actions move to Common; project selections
  become explicit project entries).
- Provider, command injection, and the palette share one availability check.

## 6.1.0 — 2026-10-23

- **Action as the umbrella term** for Skill and Command in the docs.
- **Availability improvements.** The current project is detected from the
  latest session cwd, a registered workspace ancestor wins over a nested `.git`,
  the palette marks Actions unavailable in the current project and refuses to
  insert them, and its scope picker gains a “current project only” choice.
- The editor adds a current-project shortcut, labels stale or missing project
  entries, and warns when an empty project selection makes an Action unavailable.
- Project entries are de-duplicated when saved, and availability is returned
  per Action by `/state`.

## 6.0.5 — 2026-10-23

- **Complete the loaded skill definition.** `get()` now also returns the
  `invocation: { modelInvocable: true, userInvocable: false }` policy. Without it
  the DSH `skill` tool crashed on `reading 'modelInvocable'` after a successful
  provider lookup.

## 6.0.4 — 2026-10-23

- **Fix model skill loading.** The provider's `get()` returned `provider` but not
  the required `source` string, so DSH's `skill` tool failed with
  `loaded skill "..." source must be a string` and the model fell back to reading
  the file by hand. The definition now includes `source: "action-hub"`.

## 6.0.3 — 2026-10-23

- **Keep Action Hub skills out of the native `/` menu** while keeping them
  model-invocable: provider candidates now use
  `{ modelInvocable: true, userInvocable: false }`. The `/` menu from the Host
  notification change is no longer needed for these entries.
- Palette Skill rows now insert the skill body (and send it on Ctrl/⌘+Enter)
  instead of writing a `/name` token.

## 6.0.2 — 2026-10-23

- **Refresh the Web `/` skill menu after mode/scope changes.** The DSH client
  caches its skill catalog until an agent-preset event; the Host now emits the
  same `commands/change` + `agent-preset/selected` notifications used by the
  skills manager, so a skill switched on becomes visible without a reload.

## 6.0.1 — 2026-10-23

- **Prune orphan entries from `state.json`.** Deleting a skill directory outside
  the plugin (for example from the file explorer) now removes its local mode /
  scope / usage state on the next library read, instead of leaving permanent
  orphans. Built-in state and temporarily unreadable skill directories are kept.
- Fix a race in ZIP import where the temporary extraction directory could be
  removed before the imported files were copied.

## 6.0.0 — 2026-10-23

- **Standard-first redesign.** Each entry is now a standard Agent Skill directory
  (`SKILL.md` + resources). `action.json` is gone; plugin-only state lives in
  `state.json` outside the skill directory.
- **Same file, two local modes.** Command (default, zero context, palette only)
  and Skill (explicitly enabled, DSH provider) switch locally without editing or
  copying the file.
- **Any standard SKILL.md can be imported** as-is from a folder or ZIP, with a
  real YAML parser; imports default to Command and can be enabled as Skill with a
  cost notice.
- **Project scopes** are local, fail-closed, and checked both in the provider and
  at the Command injection point.
- **Clean v6 start**: old test-era `actions/` data is archived to
  `backup-v5-test-*`; no v5 migration compatibility is kept.

## 5.3.5 — 2026-10-22

- **Removed the `/action` slash command.** The palette already covers search,
  arguments, insertion, and immediate send; keeping a second name-based command
  entry was redundant. The `agent/pre-step` chip expander and all palette paths
  remain unchanged.

## 5.3.4 — 2026-10-22

- **Inserting several Actions no longer corrupts the draft.**
  - The palette maps the detect-coordinate caret to clipboard offsets through
    existing chips, so a second insertion stays at the caret instead of being
    appended with a newline.
  - A draft that already starts with an Action marker is no longer mistaken for
    a slash command; the second Action keeps its name chip instead of degrading
    to a raw `/ah-…` marker.
  - Existing chips keep their labels/offsets; the caret lands after the newly
    inserted chip.

## 5.3.3 — 2026-10-22

- **Tab now inserts the selected Action**, matching the `/` reference menu's
  completion gesture. Enter keeps inserting too; Ctrl/⌘+Enter still sends.
  Shift+Tab no longer switches categories and falls through to normal focus
  navigation.

## 5.3.2 — 2026-10-22

- **Caret stays after the inserted Action** when closing the palette after an
  insertion, instead of jumping to the end of the draft. Plain-text insertion
  keeps the input's caret; Escape still restores focus without moving a live
  selection.

## 5.3.1 — 2026-10-22

- **Refactored for smaller, focused files.**
  - `client.js` is now generated from 15 ordered fragments under `src/client/`
    (loader/CSS/i18n/helpers/stores/shortcuts/reference source/UI/page/dialogs/
    palette/session/settings/apply). `npm run build` concatenates them; the
    output is byte-identical to the previous bundle.
  - `npm run dev` watches `src/client/` and rebuilds automatically; `pretest`
    and `prepack` run the build.
  - Host helpers moved into `host/state.js` (user + built-in sources),
    `host/refs.js` (reference handles and injection), and `host/invoke.js`
    (`/action` command and pre-step expander). `index.js` keeps only the plugin
    surface and HTTP routes.
  - Removed dead code found by an audit: 20 unused i18n keys, 4 unused icons,
    7 unused CSS rules, and the obsolete folder-export/import wrappers
    (`exportActionFolder`, `exportAllFolder`, `importFolder`,
    `importZipBuffer`, `readDocument`).

## 5.3.0 — 2026-10-22

- **Built-in Actions now use standard Action directories inside the plugin
  package** (`builtin-actions/<id>/action.json` + optional `files/`), loaded
  read-only by `builtins.js`. They gain the same resource support and document
  format as user Actions while still never entering the user data directory.
- Built-in Actions sort **after user Actions by default**, but can be pinned.
  Pin and usage state live in a small `builtin-state.json` sidecar (never in
  `actions/`); the Host only accepts `pinned` updates for built-in ids.
- Usage counters now track **total, this week, and this month**; the library adds
  the matching sort modes. `/touch` and `/action` update all three counters.
- `package.json` ships `builtin-actions/`, `builtins.js`, `builtin-state.js`.

## 5.2.1 — 2026-10-22

- Removed the **“粘贴 JSON”** import tab; Action import now has a single,
  preview-first bundle flow (folder or ZIP). Legacy JSON import keys and docs
  were cleaned up.

## 5.2.0 — 2026-10-22

- **Built-in Actions now live in plugin code, not the user data directory.**
  - The default “Action 导入助手” is bundled with the plugin and updated
    automatically on plugin upgrades; it no longer writes to
    `~/.dsh/dsh-action-hub/actions`.
  - Built-in Actions are read-only in the library: no edit, delete, pin, or
    single export; the Host rejects `/update`, `/delete`, and `/create`
    overwrites for their ids.
  - Startup cleanup removes the persisted copy that older versions installed
    (and the `.defaults-v1` marker).
  - The settings data count now counts only user Actions.

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
