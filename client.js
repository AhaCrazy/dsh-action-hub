/**
 * dsh-action-hub — Client half (Web UI).
 *
 * Product surfaces:
 *   - `conversation.input.left`: a compact "Actions" trigger in the composer tool row.
 *   - `conversation.input.overlay`: a session bridge that hands the palette the
 *     live composer facade (inputActions / input state) it needs to insert text.
 *   - `shell.overlay`: the Spotlight-style palette (Alt+A / ⌥+A), rendered at
 *     the frame level so it is never clipped by the composer card.
 *   - `main` + `sidebar.panellist`: the management library.
 *   - `settings.section`: preferences and data controls.
 *
 * Nothing here registers a tool or prompt section: an Action reaches a model
 * only through a user action in this UI.
 */
window.__ModuleLoader__.load({
  id: 'dsh-action-hub',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'action-hub';
    const PANEL_ID = 'dsh-action-hub';
    const API = '/api/dsh-action-hub';
    const PKG = 'dsh-action-hub';
    const VERSION = '7.8.0';
    const PREFS_KEY = 'dsh-action-hub/prefs';
    const ARG_TOKENS = ['{{args}}', '{{ARGS}}', '$ARGUMENTS', '{{input}}'];
    const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

    const CSS = `
      .ah-page { box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; height: 100%; min-height: 0; padding: 24px 26px 26px; color: var(--dsw-alias-label-primary); }
      .ah-head { display: flex; align-items: flex-start; gap: 18px; flex-wrap: wrap; }
      .ah-head-main { flex: 1 1 320px; min-width: 0; }
      .ah-title { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 660; letter-spacing: .01em; }
      .ah-sub { margin: 7px 0 0; font-size: 12.5px; line-height: 1.65; color: var(--dsw-alias-label-secondary); max-width: 74ch; }
      .ah-head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ah-btn { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border-radius: 9px; height: 32px; padding: 0 12px; font: inherit; font-size: 12.5px; line-height: 1; display: inline-flex; align-items: center; gap: 7px; cursor: pointer; white-space: nowrap; }
      .ah-btn:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
      .ah-btn:active { transform: translateY(.5px); }
      .ah-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
      .ah-btn-primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: var(--dsw-alias-bg-base); }
      .ah-btn-primary:hover { background: var(--dsw-alias-brand-primary); filter: brightness(1.07); border-color: transparent; }
      .ah-btn-ghost { background: transparent; border-color: transparent; color: var(--dsw-alias-label-secondary); }
      .ah-btn-ghost:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); border-color: transparent; }
      .ah-btn-danger { color: var(--dsw-alias-state-error-primary); }
      .ah-btn-icon { width: 32px; padding: 0; justify-content: center; }
      .ah-btn-sm { height: 28px; font-size: 12px; padding: 0 10px; border-radius: 8px; }
      .ah-btn-sm.ah-btn-icon { width: 28px; padding: 0; }
      .ah-btn[data-active="true"] { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); background: transparent; }
      .ah-search { position: relative; flex: 1 1 260px; min-width: 200px; }
      .ah-search input { width: 100%; box-sizing: border-box; height: 34px; padding: 0 12px 0 32px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; outline: none; }
      .ah-search input:focus { border-color: var(--dsw-alias-brand-primary); }
      .ah-search-mark { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); display: flex; color: var(--dsw-alias-label-secondary); pointer-events: none; }
      .ah-chip { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary); border-radius: 999px; height: 26px; padding: 0 10px; font: inherit; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
      .ah-chip:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
      .ah-chip[data-active="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
      .ah-chip-count { font-size: 10.5px; opacity: .7; }
      .ah-count { font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .ah-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 218px minmax(0, 1fr); gap: 16px; }
      .ah-nav { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 12px; padding: 8px; display: flex; flex-direction: column; min-height: 0; }
      .ah-nav-label { font-size: 10.5px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); padding: 8px 10px 6px; }
      .ah-nav-list { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
      .ah-nav-item { appearance: none; border: 1px solid transparent; background: transparent; border-radius: 8px; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; height: 32px; padding: 0 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; text-align: left; }
      .ah-nav-item:hover { background: var(--dsw-alias-bg-layer-2); }
      .ah-nav-item[data-active="true"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l1); font-weight: 600; }
      .ah-nav-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-nav-count { font-size: 11px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
      .ah-nav-foot { margin-top: auto; padding-top: 8px; border-top: 1px solid var(--dsw-alias-border-l1); display: flex; flex-direction: column; gap: 2px; }
      .ah-main { display: flex; flex-direction: column; min-height: 0; gap: 10px; }
      .ah-main-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ah-main-bar .ah-search { flex: 1 1 220px; }
      .ah-sort { display: flex; align-items: center; gap: 4px; }
      .ah-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 2px; }
      .ah-row { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 10px; padding: 10px 12px; display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
      .ah-row:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); }
      .ah-row[data-selected="true"] { border-color: var(--dsw-alias-brand-primary); }
      .ah-row-star { appearance: none; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; flex: 0 0 auto; }
      .ah-row-star:hover { color: var(--dsw-alias-state-warn-primary); background: var(--dsw-alias-bg-layer-2); }
      .ah-row-star[data-on="true"] { color: var(--dsw-alias-state-warn-primary); }
      .ah-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
      .ah-row-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ah-name { font-size: 13.5px; font-weight: 620; word-break: break-word; }
      .ah-badge { font-size: 10.5px; line-height: 1; height: 18px; padding: 0 7px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l1); white-space: nowrap; display: inline-flex; align-items: center; }
      .ah-badge-accent { color: var(--dsw-alias-brand-primary); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent); background: transparent; }
      .ah-badge-warn { color: var(--dsw-alias-state-warn-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, transparent); background: transparent; }
      .ah-desc { margin: 0; font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-meta { font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .ah-row-actions { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; opacity: .55; }
      .ah-row:hover .ah-row-actions, .ah-row:focus-within .ah-row-actions { opacity: 1; }
      .ah-empty { flex: 1 1 auto; min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border: 1px dashed var(--dsw-alias-border-l1); border-radius: 12px; padding: 46px 24px; text-align: center; }
      .ah-empty-icon { color: var(--dsw-alias-label-secondary); opacity: .8; }
      .ah-empty-title { font-size: 14px; font-weight: 620; }
      .ah-empty-copy { font-size: 12.5px; line-height: 1.7; color: var(--dsw-alias-label-secondary); max-width: 56ch; }
      .ah-empty-actions { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; justify-content: center; }
      .ah-notice { font-size: 12px; line-height: 1.55; border-radius: 8px; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); }
      .ah-notice[data-kind="error"] { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent); }
      .ah-notice[data-kind="ok"] { color: var(--dsw-alias-state-success-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 55%, transparent); }
      .ah-toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 300; max-width: min(560px, calc(100vw - 40px)); padding: 8px 14px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 9px; background: var(--dsw-alias-bg-overlay); box-shadow: 0 14px 38px rgba(0, 0, 0, .36); font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-primary); pointer-events: none; }
      .ah-toast[data-kind="error"] { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent); }
      .ah-toast[data-kind="ok"] { color: var(--dsw-alias-state-success-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 55%, transparent); }
      .ah-kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 5px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 10.5px; font-family: inherit; line-height: 1; }
      /* modal */
      .ah-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(9, 11, 16, .42); display: flex; align-items: center; justify-content: center; padding: 24px; }
      .ah-backdrop[data-palette="true"] { align-items: flex-start; padding-top: max(10vh, 48px); backdrop-filter: blur(4px); }
      .ah-modal { width: min(680px, 100%); max-height: min(86vh, 880px); display: flex; flex-direction: column; background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; box-shadow: 0 26px 70px rgba(0, 0, 0, .46); overflow: hidden; outline: none; }
      .ah-modal-head { display: flex; align-items: center; gap: 12px; padding: 16px 20px 13px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .ah-modal-title { margin: 0; font-size: 15px; font-weight: 650; flex: 1 1 auto; }
      .ah-modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
      .ah-modal-foot { padding: 12px 20px 16px; border-top: 1px solid var(--dsw-alias-border-l1); display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
      .ah-modal-wide { width: min(900px, 96vw); max-height: min(90vh, 920px); }
      .ah-config-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--dsw-alias-border-l1); margin: -4px 0 2px; }
      .ah-modal-head .ah-config-tabs { border-bottom: 0; margin: 0; gap: 2px; }
      .ah-modal-head .ah-config-tab { top: 0; padding: 7px 14px; }
      .ah-config-tab { appearance: none; border: 1px solid transparent; border-bottom: 0; border-radius: 9px 9px 0 0; background: transparent; color: var(--dsw-alias-label-secondary); padding: 8px 16px; font: inherit; font-size: 12.5px; cursor: pointer; position: relative; top: 1px; }
      .ah-config-tab:hover { color: var(--dsw-alias-label-primary); }
      .ah-config-tab[data-active="true"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); font-weight: 650; }
      .ah-config-pane[hidden] { display: none; }
      .ah-config-body { display: flex; flex-direction: column; gap: 10px; }
      .ah-config-foot { margin: 8px -20px -16px; position: sticky; bottom: -1px; z-index: 3; background: var(--dsw-alias-bg-overlay); }
      .ah-group-create { display: flex; align-items: center; gap: 8px; }
      .ah-group-create .ah-input { flex: 1 1 auto; }
      .ah-group-layout { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 14px; min-height: 380px; }
      .ah-group-list { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; padding: 6px; overflow-y: auto; background: var(--dsw-alias-bg-layer-1); display: flex; flex-direction: column; gap: 3px; }
      .ah-group-item { border: 1px solid transparent; border-radius: 8px; padding: 8px 9px; cursor: pointer; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 8px; align-items: center; }
      .ah-group-item:hover { background: transparent; }
      .ah-group-item:not([data-active="true"]):hover .ah-group-name { color: var(--dsw-alias-brand-primary); }
      .ah-group-item[data-active="true"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); box-shadow: inset 3px 0 0 var(--dsw-alias-brand-primary); }
      .ah-group-item-main { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .ah-group-name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-group-count { font-size: 11px; color: var(--dsw-alias-label-secondary); text-align: right; }
      .ah-group-item-actions { display: none; }
      .ah-group-rename { grid-column: 1 / -1; display: flex; gap: 4px; align-items: center; }
      .ah-group-context {
        position: fixed;
        z-index: 120;
        min-width: 132px;
        padding: 4px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 9px;
        background: var(--dsw-alias-bg-overlay);
        box-shadow: 0 16px 44px rgba(0, 0, 0, .38);
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .ah-group-context-item { appearance: none; border: 0; background: transparent; color: var(--dsw-alias-label-primary); text-align: left; padding: 7px 9px; border-radius: 6px; font: inherit; font-size: 12px; cursor: pointer; }
      .ah-group-context-item:hover { background: var(--dsw-alias-bg-layer-2); }
      .ah-group-context-item[data-danger="true"] { color: var(--dsw-alias-state-error-primary); }
      .ah-group-rename .ah-input { flex: 1 1 auto; }
      .ah-group-detail { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
      .ah-group-detail-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 12px 8px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .ah-group-detail-title { margin: 0; font-size: 14px; font-weight: 650; }
      .ah-group-detail-actions { display: flex; gap: 2px; }
      .ah-scope-project-head { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .ah-scope-project-path { font-size: 11px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
      .ah-group-tools { padding: 9px 12px 7px; display: flex; flex-direction: column; gap: 7px; }
      .ah-group-tools .ah-search, .ah-field .ah-search { flex: 0 0 auto; width: 100%; }
      .ah-group-filters { display: flex; gap: 4px; }
      .ah-group-actions { overflow-y: auto; padding: 2px 8px 10px; display: flex; flex-direction: column; gap: 2px; }
      .ah-group-action { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; position: relative; }
      .ah-group-action:hover { background: var(--dsw-alias-bg-layer-2); }
      .ah-group-action[data-checked="true"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); }
      .ah-action-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .ah-action-check { width: 14px; height: 14px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; color: transparent; background: transparent; }
      .ah-action-check[data-state="on"] { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-overlay); }
      .ah-action-check[data-state="inherited"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }
      .ah-action-input:focus-visible + .ah-action-check { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .ah-group-action-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .ah-group-action-name { font-size: 12.5px; font-weight: 600; }
      .ah-group-action-desc { font-size: 11px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-group-dirty { margin-right: auto; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
      .ah-group-empty { padding: 24px 12px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .ah-group-section-label { font-size: 12px; font-weight: 600; margin-bottom: 3px; }
      .ah-group-includes { padding: 10px 12px 2px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .ah-group-includes .ah-hint { margin: 0 0 7px; }
      .ah-group-include-list { display: flex; flex-wrap: wrap; gap: 5px; padding-bottom: 8px; }
      .ah-group-include { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; padding: 4px 8px; cursor: pointer; font-size: 11.5px; }
      .ah-group-include[data-checked="true"] { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
      .ah-group-include[data-cycle="true"] { border-style: dashed; }
      .ah-group-include[data-effective="true"] { border-style: dashed; background: var(--dsw-alias-bg-layer-2); }
      .ah-group-include-name { font-weight: 600; }
      .ah-group-inherited { padding: 8px 12px 10px; border-top: 1px solid var(--dsw-alias-border-l1); }
      .ah-group-inherited-list { display: flex; flex-wrap: wrap; gap: 4px; }
      @media (max-width: 720px) { .ah-group-layout { grid-template-columns: 1fr; } }
      .ah-field { display: flex; flex-direction: column; gap: 6px; }
      .ah-label { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
      .ah-hint { font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
      .ah-field-row { display: flex; gap: 14px; flex-wrap: wrap; }
      .ah-field-row > .ah-field { flex: 1 1 200px; min-width: 150px; }
      .ah-input, .ah-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; padding: 9px 11px; outline: none; }
      .ah-input:focus, .ah-textarea:focus { border-color: var(--dsw-alias-brand-primary); }
      .ah-textarea { resize: vertical; min-height: 160px; font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; font-size: 12.5px; line-height: 1.65; }
      .ah-code { margin: 0; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; font-size: 12px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; max-height: 280px; overflow: auto; }
      .ah-list-plain { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
      .ah-plain-item { border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; padding: 9px 11px; display: flex; align-items: center; gap: 10px; }
      .ah-plain-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .ah-plain-name { font-size: 12.5px; font-weight: 600; }
      .ah-hidden { display: none !important; }
      .ah-user-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 260px; padding: 0 6px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); color: color-mix(in srgb, var(--dsw-alias-brand-primary) 82%, var(--dsw-alias-label-primary)); font-weight: 500; user-select: none; }
      .ah-user-chip-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-resource-list { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; max-height: 180px; overflow: auto; }
      .ah-tree-row { display: flex; align-items: center; gap: 7px; min-height: 24px; padding: 1px 6px; border-radius: 6px; }
      .ah-tree-row:hover { background: var(--dsw-alias-bg-layer-1); }
      .ah-tree-name { font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .ah-resource-item { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }
      .ah-resource-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: none; background: none; color: var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary)); font: inherit; text-align: left; cursor: pointer; padding: 0; }
      .ah-resource-size { flex: none; font-size: 11px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
      .ah-resource-preview { margin: 8px 0 0; max-height: 220px; overflow: auto; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
      .ah-export-list { display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow: auto; }
      .ah-export-item { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); cursor: pointer; }
      .ah-export-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-export-meta { flex: none; font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .ah-import-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 6px 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .ah-import-stat { padding: 1px 7px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; background: var(--dsw-alias-bg-layer-1); }
      .ah-import-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow: auto; margin-top: 6px; }
      .ah-import-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); }
      .ah-import-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
      .ah-import-name { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .ah-import-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-import-badge { flex: none; padding: 1px 6px; border-radius: 999px; font-size: 10px; border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }
      .ah-import-badge[data-status="new"] { color: var(--dsw-alias-state-success-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent); }
      .ah-import-badge[data-status="update"] { color: var(--dsw-alias-state-business-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent); }
      .ah-import-badge[data-status="conflict"] { color: var(--dsw-alias-state-warn-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, transparent); }
      .ah-import-desc { font-size: 11.5px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-import-meta { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
      .ah-import-warning { font-size: 11px; color: var(--dsw-alias-state-warn-primary); }
      .ah-import-select { flex: none; height: 30px; max-width: 170px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; padding: 0 8px; }
      /* palette */
      .ah-palette { width: min(940px, calc(100vw - 32px)); max-height: min(76vh, 720px); display: flex; flex-direction: column; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); border-radius: 15px; box-shadow: 0 30px 80px rgba(0, 0, 0, .5); overflow: hidden; }
      .ah-palette-search { display: flex; align-items: center; gap: 10px; padding: 14px 16px 10px; }
      .ah-palette-search .ah-search { flex: 1 1 auto; }
      .ah-palette-search input { height: 38px; font-size: 14px; border-radius: 10px; }
      .ah-palette-cats { display: flex; align-items: center; gap: 6px; padding: 0 16px 10px; overflow-x: auto; }
      .ah-palette-cats::-webkit-scrollbar { height: 0; }
      .ah-palette-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 42%) minmax(0, 58%); border-top: 1px solid var(--dsw-alias-border-l1); }
      .ah-results { overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 2px; border-right: 1px solid var(--dsw-alias-border-l1); }
      .ah-result { appearance: none; border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 8px 10px; display: flex; align-items: flex-start; gap: 9px; text-align: left; font: inherit; cursor: pointer; }
      .ah-result:hover { background: var(--dsw-alias-bg-layer-2); }
      .ah-result[data-active="true"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); }
      .ah-result[data-unavailable="true"] { opacity: 0.52; }
      .ah-result[data-unavailable="true"]:hover { opacity: 0.7; }
      .ah-scope-stale { opacity: 0.65; }
      .ah-hint-warn { color: var(--dsw-alias-state-warn-primary); }
      .ah-result-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
      .ah-result-title { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .ah-result-name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-result-desc { font-size: 11.5px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-result-star { color: var(--dsw-alias-state-warn-primary); flex: 0 0 auto; }
      .ah-preview { padding: 16px 18px; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
      .ah-preview-head { display: flex; align-items: flex-start; gap: 10px; }
      .ah-preview-title { margin: 0; font-size: 15px; font-weight: 650; word-break: break-word; flex: 1 1 auto; }
      .ah-preview-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .ah-preview-desc { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
      .ah-preview-body { flex: 1 1 auto; min-height: 90px; }
      .ah-preview-empty { flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; text-align: center; padding: 24px; }
      .ah-palette-foot { border-top: 1px solid var(--dsw-alias-border-l1); padding: 10px 14px; display: flex; flex-direction: column; align-items: stretch; gap: 8px; }
      .ah-foot-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .ah-args { flex: 1 1 auto; display: flex; align-items: center; gap: 8px; min-width: 0; }
      .ah-args .ah-input { height: 32px; font-size: 12px; padding: 0 10px; }
      .ah-actions { display: flex; align-items: center; gap: 6px; flex: none; flex-wrap: nowrap; }
      .ah-hints { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--dsw-alias-label-secondary); flex-wrap: wrap; }
      .ah-toast { margin: 0 14px; padding: 7px 11px; border-radius: 8px; font-size: 12px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); }
      .ah-toast[data-kind="ok"] { color: var(--dsw-alias-state-success-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, transparent); }
      .ah-toast[data-kind="error"] { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 50%, transparent); }
      .ah-trigger { appearance: none; border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
      .ah-trigger:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l1); }
      .ah-trigger[data-open="true"] { color: var(--dsw-alias-brand-primary); }
      /* settings */
      .ah-settings { display: flex; flex-direction: column; gap: 18px; }
      .ah-settings-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
      .ah-settings-title { margin: 0; font-size: 13px; font-weight: 650; }
      .ah-settings-row { display: flex; align-items: center; gap: 16px; }
      .ah-settings-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
      .ah-settings-row-title { font-size: 12.5px; font-weight: 600; }
      .ah-settings-row-desc { font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
      .ah-switch { appearance: none; width: 36px; height: 20px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); position: relative; cursor: pointer; flex: 0 0 auto; padding: 0; transition: background .15s ease; }
      .ah-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--dsw-alias-label-secondary); transition: transform .15s ease, background .15s ease; }
      .ah-switch[aria-checked="true"] { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); }
      .ah-switch[aria-checked="true"]::after { transform: translateX(16px); background: var(--dsw-alias-bg-base); }
      @media (max-width: 760px) {
        .ah-body { grid-template-columns: minmax(0, 1fr); }
        .ah-nav { display: none; }
        .ah-palette-body { grid-template-columns: minmax(0, 1fr); }
        .ah-preview { display: none; }
      }
    `;

    const TEXT = {
      zh: {
        'app.title': 'Action Hub',
        'app.subtitle': '标准 Skill 库：同一份 SKILL.md 可以只由你作为 Command 调用，也可以切换为模型可调用的 Skill。',
        'app.name': 'Actions',
        'action.new': '新建 Action',
        'action.import': '导入',
        'action.groups': '分组',
        'action.scopes': '项目范围',
        'action.switchToSkill': '切换为 Skill',
        'action.switchToCommand': '切换为 Command',
        'action.export': '导出',
        'action.refresh': '刷新',
        'action.save': '保存',
        'action.cancel': '取消',
        'action.delete': '删除',
        'action.deleteForever': '确认删除',
        'action.edit': '编辑',
        'action.copy': '复制正文',
        'action.pin': '置顶',
        'action.unpin': '取消置顶',
        'action.close': '关闭',
        'lib.all': '全部',
        'lib.uncategorized': '未分类',
        'lib.categories': '分类',
        'lib.manageCategories': '管理分类',
        'lib.search': '搜索名称、描述、分类、标签或正文…',
        'lib.count': '{count} 个条目',
        'lib.countFiltered': '{count} / {total}',
        'lib.sortRecent': '最近使用',
        'lib.sortName': '名称',
        'lib.sortCreated': '最近创建',
        'lib.sortWeek': '本周使用',
        'lib.sortMonth': '本月使用',
        'lib.sortTotal': '总使用次数',
        'lib.sortLabel': '排序',
        'lib.emptyTitle': '收藏夹还是空的',
        'lib.emptyCopy': '把经常重复输入的提示词存成 Action：从右侧新建，或导入现成的 Action 包。',
        'lib.emptyFiltered': '没有匹配的 Action。换个关键词或分类试试。',
        'lib.emptyCta': '新建第一个 Action',
        'lib.loading': '读取中…',
        'lib.loadFailed': '读取 Actions 失败：{error}',
        'lib.retry': '重试',
        'lib.copied': '正文已复制',
        'lib.copyFailed': '复制失败，请手动选择正文',
        'lib.saved': '已保存',
        'lib.deleted': '已删除',
        'lib.exported': '已导出',
        'lib.exportOne': '导出 ZIP',
        'export.title': '选择要导出的 Action',
        'export.hint': '勾选要一起导出的 Action；ZIP 解压后每条 Action 都是一个自包含目录。',
        'export.selectAll': '全选',
        'export.clear': '清空',
        'export.selected': '已选 {count} / {total}',
        'export.run': '导出所选 ZIP',
        'lib.pinned': '已置顶',
        'lib.unpinned': '已取消置顶',
        'lib.modeSkill': '已切换为 Skill',
        'lib.modeCommand': '已切换为 Command',
        'lib.updated': '更新于 {time}',
        'lib.used': '用过 {count} 次',
        'lib.builtin': '内置',
        'lib.skill': 'Skill',
        'lib.command': 'Command',
        'lib.useInChat': '在任意会话输入框左侧的 Actions 按钮中调用',
        'editor.createTitle': '新建 Action',
        'editor.editTitle': '编辑 Action',
        'editor.name': '名称',
        'editor.namePlaceholder': '例如：代码审查',
        'editor.nameHint': '显示在收藏夹与面板中的名字。',
        'editor.category': '分类',
        'editor.categoryPlaceholder': '开发 / 效率 / …',
        'editor.categoryHint': '自由填写，已有分类会作为候选。',
        'editor.tags': '标签',
        'editor.tagsPlaceholder': 'git, commit',
        'editor.tagsHint': '逗号分隔，参与搜索。',
        'editor.description': '描述',
        'editor.descriptionPlaceholder': '一句话说明它做什么',
        'editor.descriptionHint': '显示在列表里，也参与搜索。',
        'editor.args': '参数提示',
        'editor.argsPlaceholder': '例如：分支名',
        'editor.argsHint': '调用时会提示填写；正文里的 {{args}} 会被替换。',
        'editor.resources': '资源文件',
        'editor.resourcesHint': '只读展示该 Action 的 files/ 目录。增删文件请直接在文件浏览器里操作，然后刷新管理库。',
        'editor.resourceSaved': '新建 Action 为纯文本；保存后如需附件，请在文件浏览器里把文件放进该 Action 的 files/ 目录。',
        'editor.resourcesEmpty': '暂无资源文件。',
        'editor.resourceEmptyText': '（无法预览的文件）',
        'editor.prompt': '提示词正文',
        'editor.promptPlaceholder': '把要发给 Agent 的提示词写在这里…',
        'editor.promptHint': '支持多段 Markdown；{{args}} 是参数，{{date}} 是当天日期。',
        'editor.pinned': '置顶',
        'editor.mode': '调用方式',
        'editor.modeCommand': 'Command（只有你能调用，不占上下文）',
        'editor.modeSkill': 'Skill（模型可自行调用，每请求占目录）',
        'editor.modeCommandHint': '只在 Action 面板中由你主动调用。',
        'editor.modeSkillHint': '会注册给模型；确认成本后再启用。',
        'editor.groups': 'Action 分组',
        'editor.groupCommon': '默认',
        'editor.groupsHint': '一个 Action 可以属于多个分组；项目通过分组获得可用性。',
        'editor.scope': '可用范围',
        'editor.scopeAll': '所有项目',
        'editor.scopeCurrent': '仅当前项目（{name}）',
        'editor.scopeCurrentBadge': '当前项目',
        'editor.scopeStale': '项目已失效',
        'editor.scopeEmpty': '没有选择任何项目，这个 Action 将不可用。',
        'editor.scopeNoCurrent': '当前无法确定项目；项目范围默认不可用。',
        'editor.scopeHint': '取消“所有项目”后，只勾选的项目能调用；未知项目默认不可用。',
        'editor.required': '请填写名称与正文。',
        'delete.title': '删除这个 Action？',
        'delete.copy': '「{name}」会从收藏夹永久移除。',
        'import.title': '导入 Actions',
        'import.bundleHint': '选择文件夹或 ZIP 后先进入预览；可以为每个 Action 单独选择跳过、导入为新 Action 或更新本地副本。',
        'import.bundleFolder': '选择文件夹',
        'import.bundleZip': '选择 ZIP',
        'import.previewTitle': '导入预览',
        'import.previewHint': '请先检查内容，再决定每一项怎么处理。来源：{source}',
        'import.summaryTotal': '共 {total} 项',
        'import.status.new': '新增',
        'import.status.duplicate': '重复',
        'import.status.update': '可更新',
        'import.status.conflict': '冲突',
        'import.mode.skip': '跳过',
        'import.mode.create': '导入为新 Action',
        'import.mode.update': '更新本地 Action',
        'import.itemResources': '{count} 个资源文件',
        'import.itemExisting': '本地已有：{name}',
        'import.itemDuplicate': '内容相同：{name}',
        'import.conflictHint': '本地副本已修改，默认保留本地；确认覆盖时请选择“更新本地 Action”。',
        'import.back': '返回',
        'import.confirm': '确认导入',
        'import.bundleResult': '导入完成：新增 {imported}，更新 {updated}，跳过 {skipped}（重复 {duplicated}，冲突 {conflicts}）',
        'import.bundleUnavailable': '当前环境无法打开目录选择器，请改用 ZIP。',
        'category.title': '分类管理',
        'category.empty': '还没有分类',
        'category.rename': '重命名',
        'category.delete': '删除分类',
        'category.deleteConfirm': '删除分类「{name}」？',
        'category.deleteConfirmDesc': '该分类下还有 {count} 个 Action。删除分类后它们会移到未分类，Action 本身不会被删除。',
        'category.deleteConfirmEmpty': '该分类下没有 Action，可以安全删除。',
        'category.confirmDelete': '确认删除',
        'category.name': '新名称',
        'palette.title': '选择一个 Action',
        'palette.search': '搜索 Action…',
        'palette.empty': '还没有 Action',
        'palette.emptyCopy': '新建一条，或从管理页导入，之后在这里一搜即用。',
        'palette.noMatch': '没有匹配的 Action',
        'palette.args': '参数（可选，替换 {{args}}）',
        'palette.insert': '插入',
        'palette.send': '发送',
        'palette.manage': '管理',
        'palette.inserted': '已插入输入框',
        'palette.insertedAtCaret': '已插入到光标处',
        'palette.sent': '已插入并发送',
        'palette.insertFailed': '当前会话暂时无法写入输入框',
        'palette.sendFailed': '发送失败，草稿已保留',
        'palette.hintNav': '选择',
        'palette.hintInsert': '插入',
        'palette.hintSend': '发送',
        'palette.hintTab': '切换分组',
        'palette.refHint': '将以引用方式插入：对话中只显示「{name}」',
        'palette.skillHint': '将插入技能正文；Agent 仍可自行调用，但不进入 / 菜单',
        'palette.scope': '可用范围',
        'palette.scopeAll': '所有项目',
        'palette.scopeCustom': '多个项目',
        'palette.scopeCurrent': '仅当前项目：{name}',
        'palette.scopeSaved': '范围已更新',
        'palette.scopeUnavailable': '当前不可用',
        'palette.unavailable': '当前项目不可用此 Action',
        'palette.unavailableHint': '这个 Action 不在当前项目的可用范围内；可切换范围或到管理页调整。',
        'palette.currentProject': '当前项目：{name}',
        'palette.noCurrentProject': '未识别当前项目',
        'palette.noGroups': '未分组',
        'groups.title': 'Action 分组',
        'config.title': 'Action 配置',
        'groups.hint': '分组是 Action 的集合；项目通过勾选分组获得其中所有 Action。',
        'groups.namePlaceholder': '新分组名，如 Common、AgilityDog、漫剧',
        'groups.create': '创建分组',
        'groups.rename': '重命名',
        'groups.renamePrompt': '新的分组名',
        'groups.delete': '删除',
        'groups.deleteConfirm': '删除分组“{name}”？Action 会保留，但项目不再通过该分组获得它们。',
        'groups.actionCount': '{count} 个 Action',
        'groups.actionsTitle': '“{name}”包含的 Action',
        'groups.actionSearch': '搜索要加入分组的 Action',
        'groups.defaultBadge': '默认',
        'groups.save': '保存修改',
        'groups.unsaved': '已修改 {count} 项',
        'groups.noChanges': '没有未保存的修改',
        'groups.discard': '还有 {count} 项未保存，确定放弃修改？',
        'groups.empty': '还没有分组',
        'groups.selectAll': '全选',
        'groups.clear': '清空',
        'groups.filterAll': '全部',
        'groups.filterSelected': '已选',
        'groups.filterUnselected': '未选',
        'groups.noMatch': '没有匹配的 Action',
        'groups.includesTitle': '包含其他分组',
        'groups.includesHint': '勾选后继承子分组的全部 Action；灰色勾表示由子分组继承，点击可切换为蓝色直接选中；环引用合并为同一集合。',
        'groups.cycleHint': '会形成环，按合集生效',
        'groups.effectiveBadge': '已间接生效',
        'groups.effectiveHint': '该分组已通过当前引用关系间接包含，无需重复勾选。',
        'groups.inheritedTitle': '通过子分组继承的 Action',
        'groups.inheritedBadge': '继承',
        'groups.inheritedFrom': '包含该 Action 的分组：{groups}',
        'scope.title': '项目可用范围',
        'scope.project': '项目',
        'scope.groups': '可用分组',
        'scope.extraActions': '单独追加的 Action',
        'scope.searchActions': '搜索 Action',
        'scope.viaGroup': '已由分组覆盖',
        'scope.projects': '项目列表',
        'scope.groupsHint': '勾选分组后，该项目的 Action 范围会自动包含子分组的 Action。',
        'scope.extraHint': '灰色勾表示由已选分组覆盖，点击可切换为蓝色单独选中；无需重复追加。',
        'scope.groupCount': '{count} 个分组',
        'scope.noProjects': '没有可配置的项目',
        'palette.refArgsHint': '已填参数，将以完整文本插入',
        'palette.refInserted': '已插入引用',
        'palette.resourceCount': '{count} 个资源',
        'palette.usage': '用过 {count} 次',
        'palette.pinned': '已置顶',
        'trigger.label': 'Actions',
        'trigger.tooltip': 'Actions 收藏夹（{keys}）',
        'shortcut.open': 'Action Hub: 打开面板',
        'shortcut.manage': 'Action Hub: 打开管理页',
        'settings.nav': 'Action Hub',
        'settings.title': 'Action Hub',
        'settings.desc': '快捷面板、插入行为与数据位置。',
        'settings.behavior': '行为',
        'settings.closeAfterInsert': '插入后关闭面板',
        'settings.closeAfterInsertDesc': '关闭后可以直接按 Enter 发送；关闭此项则留在面板里连续插入。',
        'settings.shortcutsTitle': '快捷键',
        'settings.hotkey': '打开 Actions 面板',
        'settings.hotkeyDesc': '在任意会话里打开 Actions 面板。',
        'settings.manageHotkey': '打开管理页',
        'settings.manageHotkeyDesc': '打开 Actions 管理页。',
        'settings.manageHotkeyManage': '在 设置 → 通用设置 → 快捷键 中修改。',
        'settings.hotkeyManage': '在 设置 → 通用设置 → 快捷键 中修改。',
        'settings.shortcutGroupHint': 'DSH 通用设置的快捷键分组目前是固定的，插件条目会归在「应用操作」；这里集中展示本插件的快捷键。',
        'settings.trigger': '在输入框工具行显示按钮',
        'settings.triggerDesc': '关闭后仍可用全局快捷键打开。',
        'settings.sidebarEntry': '在侧边栏显示 Actions 入口',
        'settings.sidebarEntryDesc': '关闭后侧边栏不再显示 Actions；仍可通过快捷键或输入框按钮打开。',
        'settings.data': '数据',
        'settings.dataDesc': 'Actions 保存在本机（{path}），共 {count} 条。',
        'settings.openLibrary': '打开管理页',
        'settings.export': '导出整库 ZIP',
        'settings.about': '关于',
        'settings.aboutDesc': 'Action Hub {version} · 不注册 Agent Tool、不注入上下文。',
        'settings.saved': '设置已保存',
      },
      en: {
        'app.title': 'Action Hub',
        'app.subtitle': 'A standard Skill library: one SKILL.md can stay a user-only Command or be switched into a model-invocable Skill.',
        'app.name': 'Actions',
        'action.new': 'New Action',
        'action.import': 'Import',
        'action.groups': 'Groups',
        'action.scopes': 'Project scopes',
        'action.switchToSkill': 'Switch to Skill',
        'action.switchToCommand': 'Switch to Command',
        'action.export': 'Export',
        'action.refresh': 'Refresh',
        'action.save': 'Save',
        'action.cancel': 'Cancel',
        'action.delete': 'Delete',
        'action.deleteForever': 'Delete',
        'action.edit': 'Edit',
        'action.copy': 'Copy body',
        'action.pin': 'Pin',
        'action.unpin': 'Unpin',
        'action.close': 'Close',
        'lib.all': 'All',
        'lib.uncategorized': 'Uncategorized',
        'lib.categories': 'Categories',
        'lib.manageCategories': 'Manage categories',
        'lib.search': 'Search name, description, category, tag, or body…',
        'lib.count': '{count} entries',
        'lib.countFiltered': '{count} / {total}',
        'lib.sortRecent': 'Recently used',
        'lib.sortName': 'Name',
        'lib.sortCreated': 'Recently created',
        'lib.sortWeek': 'This week',
        'lib.sortMonth': 'This month',
        'lib.sortTotal': 'Total uses',
        'lib.sortLabel': 'Sort',
        'lib.emptyTitle': 'Your shelf is empty',
        'lib.emptyCopy': 'Save the prompts you keep retyping. Create one here, or import an Action bundle.',
        'lib.emptyFiltered': 'No Action matches. Try another keyword or category.',
        'lib.emptyCta': 'Create your first Action',
        'lib.loading': 'Loading…',
        'lib.loadFailed': 'Could not load Actions: {error}',
        'lib.retry': 'Retry',
        'lib.copied': 'Prompt copied',
        'lib.copyFailed': 'Copy failed; select the body and copy manually',
        'lib.saved': 'Saved',
        'lib.deleted': 'Deleted',
        'lib.exported': 'Exported',
        'lib.exportOne': 'Export ZIP',
        'export.title': 'Choose Actions to export',
        'export.hint': 'Tick the Actions to bundle together; each one becomes a self-contained directory in the ZIP.',
        'export.selectAll': 'Select all',
        'export.clear': 'Clear',
        'export.selected': '{count} of {total} selected',
        'export.run': 'Export selected ZIP',
        'lib.pinned': 'Pinned',
        'lib.unpinned': 'Unpinned',
        'lib.modeSkill': 'Switched to Skill',
        'lib.modeCommand': 'Switched to Command',
        'lib.updated': 'Updated {time}',
        'lib.used': 'Used {count}×',
        'lib.builtin': 'Built-in',
        'lib.skill': 'Skill',
        'lib.command': 'Command',
        'lib.useInChat': 'Call it from the Actions button left of any composer',
        'editor.createTitle': 'New Action',
        'editor.editTitle': 'Edit Action',
        'editor.name': 'Name',
        'editor.namePlaceholder': 'e.g. Code review',
        'editor.nameHint': 'Shown in the shelf and the palette.',
        'editor.category': 'Category',
        'editor.categoryPlaceholder': 'Dev / Productivity / …',
        'editor.categoryHint': 'Free text; existing categories are suggested.',
        'editor.tags': 'Tags',
        'editor.tagsPlaceholder': 'git, commit',
        'editor.tagsHint': 'Comma separated; searched too.',
        'editor.description': 'Description',
        'editor.descriptionPlaceholder': 'One line on what it does',
        'editor.descriptionHint': 'Shown in the list and searched.',
        'editor.args': 'Argument hint',
        'editor.argsPlaceholder': 'e.g. branch name',
        'editor.argsHint': 'Prompted for at call time; {{args}} in the body is replaced.',
        'editor.resources': 'Resource files',
        'editor.resourcesHint': 'Read-only view of this Action’s files/ directory. Add or remove files in your file browser, then refresh the library.',
        'editor.resourceSaved': 'New Actions are plain text; after saving, put attachments into this Action’s files/ directory from your file browser.',
        'editor.resourcesEmpty': 'No resource files yet.',
        'editor.resourceEmptyText': '(not previewable)',
        'editor.prompt': 'Prompt body',
        'editor.promptPlaceholder': 'Write the prompt you send to the agent…',
        'editor.promptHint': 'Markdown is fine; {{args}} is the argument slot, {{date}} is today.',
        'editor.pinned': 'Pin to top',
        'editor.mode': 'Invocation',
        'editor.modeCommand': 'Command (you only; zero context)',
        'editor.modeSkill': 'Skill (model-invocable; catalog cost)',
        'editor.modeCommandHint': 'Only invoked by you from the Action palette.',
        'editor.modeSkillHint': 'Registered for the model; enable after the cost confirmation.',
        'editor.groups': 'Action groups',
        'editor.groupCommon': 'Default',
        'editor.groupsHint': 'An Action may belong to several groups; projects gain availability through groups.',
        'editor.scope': 'Availability',
        'editor.scopeAll': 'All projects',
        'editor.scopeCurrent': 'Current project only ({name})',
        'editor.scopeCurrentBadge': 'Current',
        'editor.scopeStale': 'Missing',
        'editor.scopeEmpty': 'No project is selected, so this Action is unavailable.',
        'editor.scopeNoCurrent': 'The current project cannot be determined; project scope fails closed.',
        'editor.scopeHint': 'Uncheck to limit to selected projects; unknown projects never match.',
        'editor.required': 'A name and a body are required.',
        'delete.title': 'Delete this Action?',
        'delete.copy': '“{name}” leaves the shelf permanently.',
        'import.title': 'Import Actions',
        'import.bundleHint': 'Choose a folder or ZIP to open a preview; set each Action to skip, import as new, or update the local copy.',
        'import.bundleFolder': 'Choose folder',
        'import.bundleZip': 'Choose ZIP',
        'import.previewTitle': 'Import preview',
        'import.previewHint': 'Review each Action before choosing what to do. Source: {source}',
        'import.summaryTotal': '{total} item(s)',
        'import.status.new': 'new',
        'import.status.duplicate': 'duplicate',
        'import.status.update': 'updatable',
        'import.status.conflict': 'conflict',
        'import.mode.skip': 'Skip',
        'import.mode.create': 'Import as new Action',
        'import.mode.update': 'Update local Action',
        'import.itemResources': '{count} resource file(s)',
        'import.itemExisting': 'Local: {name}',
        'import.itemDuplicate': 'Same content: {name}',
        'import.conflictHint': 'The local copy was modified, so it is kept by default; choose “Update local Action” only if you want to overwrite it.',
        'import.back': 'Back',
        'import.confirm': 'Import',
        'import.bundleResult': 'Imported {imported}, updated {updated}, skipped {skipped} (duplicates {duplicated}, conflicts {conflicts})',
        'import.bundleUnavailable': 'This environment cannot open the directory picker; use a ZIP instead.',
        'category.title': 'Categories',
        'category.empty': 'No categories yet',
        'category.rename': 'Rename',
        'category.delete': 'Delete',
        'category.deleteConfirm': 'Delete category “{name}”?',
        'category.deleteConfirmDesc': 'It still contains {count} Action(s). They move to Uncategorized; the Actions themselves are kept.',
        'category.deleteConfirmEmpty': 'This category has no Actions, so it is safe to delete.',
        'category.confirmDelete': 'Delete category',
        'category.name': 'New name',
        'palette.title': 'Pick an Action',
        'palette.search': 'Search Actions…',
        'palette.empty': 'No Actions yet',
        'palette.emptyCopy': 'Create one, or import from the library, and it is one search away from now on.',
        'palette.noMatch': 'No matching Action',
        'palette.args': 'Arguments (optional; replaces {{args}})',
        'palette.insert': 'Insert',
        'palette.send': 'Send',
        'palette.manage': 'Manage',
        'palette.inserted': 'Inserted into the composer',
        'palette.insertedAtCaret': 'Inserted at the caret',
        'palette.sent': 'Inserted and sent',
        'palette.insertFailed': 'This session cannot be written to right now',
        'palette.sendFailed': 'Send failed; the draft is kept',
        'palette.hintNav': 'navigate',
        'palette.hintInsert': 'insert',
        'palette.hintSend': 'send',
        'palette.hintTab': 'switch group',
        'palette.refHint': 'Inserts a reference: the transcript shows “{name}” only',
        'palette.skillHint': 'Inserts the skill body; the agent can still invoke it, but it is hidden from /',
        'palette.scope': 'Availability',
        'palette.scopeAll': 'All projects',
        'palette.scopeCustom': 'Multiple projects',
        'palette.scopeCurrent': 'Current project only: {name}',
        'palette.scopeSaved': 'Availability updated',
        'palette.scopeUnavailable': 'Unavailable',
        'palette.unavailable': 'This Action is unavailable in the current project',
        'palette.unavailableHint': 'This Action is outside the current project scope; change its availability or edit it in the library.',
        'palette.currentProject': 'Current project: {name}',
        'palette.noCurrentProject': 'Current project unknown',
        'palette.noGroups': 'No group',
        'groups.title': 'Action groups',
        'config.title': 'Action configuration',
        'groups.hint': 'A group is a set of Actions; selecting it grants every Action in it to a project.',
        'groups.namePlaceholder': 'New group name, e.g. Common, AgilityDog, Drama',
        'groups.create': 'Create group',
        'groups.rename': 'Rename',
        'groups.renamePrompt': 'New group name',
        'groups.delete': 'Delete',
        'groups.deleteConfirm': 'Delete group “{name}”? Actions stay, but projects no longer get them through this group.',
        'groups.actionCount': '{count} Actions',
        'groups.actionsTitle': 'Actions in “{name}”',
        'groups.actionSearch': 'Search Actions to add',
        'groups.defaultBadge': 'Default',
        'groups.save': 'Save changes',
        'groups.unsaved': '{count} unsaved changes',
        'groups.noChanges': 'No unsaved changes',
        'groups.discard': 'Discard {count} unsaved changes?',
        'groups.empty': 'No groups yet',
        'groups.selectAll': 'Select all',
        'groups.clear': 'Clear',
        'groups.filterAll': 'All',
        'groups.filterSelected': 'Selected',
        'groups.filterUnselected': 'Unselected',
        'groups.noMatch': 'No matching Actions',
        'groups.includesTitle': 'Includes groups',
        'groups.includesHint': 'Selecting a group includes its child groups. A grey check means inherited; click it to switch to a blue direct selection. Cycles merge into one set.',
        'groups.cycleHint': 'Forms a cycle; merged set applies',
        'groups.effectiveBadge': 'Already active',
        'groups.effectiveHint': 'This group is already included indirectly through the current references.',
        'groups.inheritedTitle': 'Actions inherited from child groups',
        'groups.inheritedBadge': 'Inherited',
        'groups.inheritedFrom': 'Contained by: {groups}',
        'scope.title': 'Project availability',
        'scope.project': 'Project',
        'scope.groups': 'Available groups',
        'scope.extraActions': 'Additional individual Actions',
        'scope.searchActions': 'Search Actions',
        'scope.viaGroup': 'Covered by a group',
        'scope.projects': 'Projects',
        'scope.groupsHint': 'Selecting a group automatically includes the Actions of its child groups.',
        'scope.extraHint': 'A grey check means the Action is covered by a selected group; click it to switch to a blue individual selection.',
        'scope.groupCount': '{count} groups',
        'scope.noProjects': 'No projects to configure',
        'palette.refArgsHint': 'Arguments are filled, so the full text is inserted',
        'palette.refInserted': 'Reference inserted',
        'palette.resourceCount': '{count} resource(s)',
        'palette.usage': 'Used {count}×',
        'palette.pinned': 'Pinned',
        'trigger.label': 'Actions',
        'trigger.tooltip': 'Action shelf ({keys})',
        'shortcut.open': 'Action Hub: Open palette',
        'shortcut.manage': 'Action Hub: Open library',
        'settings.nav': 'Action Hub',
        'settings.title': 'Action Hub',
        'settings.desc': 'Palette, insertion behavior, and where the data lives.',
        'settings.behavior': 'Behavior',
        'settings.closeAfterInsert': 'Close the palette after inserting',
        'settings.closeAfterInsertDesc': 'Then Enter sends right away. Turn off to insert several Actions in a row.',
        'settings.shortcutsTitle': 'Shortcuts',
        'settings.hotkey': 'Open Actions palette',
        'settings.hotkeyDesc': 'Opens the Actions palette in any conversation.',
        'settings.manageHotkey': 'Open library',
        'settings.manageHotkeyDesc': 'Opens the Actions library.',
        'settings.manageHotkeyManage': 'Change it in Settings → General → Shortcuts.',
        'settings.hotkeyManage': 'Change it in Settings → General → Shortcuts.',
        'settings.shortcutGroupHint': 'DSH uses fixed shortcut groups, so plugin entries live under “Application”; this page lists this plugin’s shortcuts together.',
        'settings.trigger': 'Show the composer button',
        'settings.triggerDesc': 'The global shortcut keeps working when off.',
        'settings.sidebarEntry': 'Show Actions in the sidebar',
        'settings.sidebarEntryDesc': 'Hide the sidebar entry while keeping the shortcut and composer button available.',
        'settings.data': 'Data',
        'settings.dataDesc': 'Actions are stored locally at {path} ({count} total).',
        'settings.openLibrary': 'Open library',
        'settings.export': 'Export library ZIP',
        'settings.about': 'About',
        'settings.aboutDesc': 'Action Hub {version} · registers no agent tool and injects no context.',
        'settings.saved': 'Saved',
      },
    };

    // ---------------------------------------------------------------- helpers

    /** @param {object} props @returns {(key: string, params?: object) => string} */
    function translate(props) {
      const t = typeof props?.t === 'function' ? props.t : null;
      if (t) return (key, params) => {
        const value = t(key, params);
        return typeof value === 'string' && value !== '' ? value : (TEXT.zh[key] ?? key);
      };
      return (key, params) => {
        let value = TEXT.zh[key] ?? key;
        if (params) for (const [name, replacement] of Object.entries(params)) value = value.split(`{${name}}`).join(String(replacement));
        return value;
      };
    }

    async function api(route, body) {
      const options = body === undefined
        ? { method: 'GET', credentials: 'same-origin' }
        : {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        };
      const response = await fetch(`${API}${route}`, options);
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok || payload === null || payload.ok === false) {
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }
      return payload;
    }

    function describeError(error) {
      return error instanceof Error ? error.message : String(error);
    }

    function expandPrompt(prompt, context = {}) {
      const source = typeof prompt === 'string' ? prompt : '';
      const args = typeof context.args === 'string' ? context.args.trim() : '';
      const now = context.date instanceof Date ? context.date : new Date();
      const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      const hasSlot = ARG_TOKENS.some((token) => source.includes(token));
      let expanded = source;
      for (const token of ARG_TOKENS) expanded = expanded.split(token).join(args);
      expanded = expanded.split('{{date}}').join(date).split('{{DATE}}').join(date);
      if (args !== '' && !hasSlot) expanded = `${expanded}\n\n${args}`;
      return expanded.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trimEnd();
    }

    function composeDraft(draft, text) {
      const current = typeof draft === 'string' ? draft.replace(/\s+$/, '') : '';
      const next = typeof text === 'string' ? text : '';
      if (current === '') return next;
      if (next === '') return current;
      return `${current}\n\n${next}`;
    }

    function referenceEntry(entry) {
      const next = {
        source: entry.source,
        ref: entry.ref,
        offset: entry.offset,
        length: entry.length,
        label: entry.label,
        clipboardText: entry.clipboardText,
      };
      if (entry.appearance !== undefined) next.appearance = entry.appearance;
      if (entry.invalid === true) next.invalid = true;
      return next;
    }

    /**
     * Build the semantic draft for an Action reference. The composer stores the
     * opaque `/ah-…` marker as `clipboardText` but renders `label`, so the input
     * box shows the Action name while the message still carries the marker.
     *
     * Plain drafts insert at the caret; drafts that already contain chips are
     * appended at the end, because their offsets live in clipboard coordinates
     * while the caret is reported in detect coordinates.
     *
     * @param {{ draft: string, span?: object, occurrences?: object[], marker: string, label: string }} input
     * @returns {{ text: string, references: object[] } | null}
     */
    function composeReferenceDraft({ draft, span, occurrences, marker, label }) {
      if (typeof draft !== 'string' || typeof marker !== 'string' || marker === '') return null;
      const existing = Array.isArray(occurrences)
        ? occurrences.filter((entry) => entry !== null && typeof entry === 'object'
          && Number.isInteger(entry.offset) && Number.isInteger(entry.length)
          && typeof entry.clipboardText === 'string')
          .sort((left, right) => left.offset - right.offset)
        : [];
      // Detect-coordinate spans count one placeholder per chip, while clipboard
      // offsets count the chip's full marker (`/ah-…`). Translate the caret.
      const detectToClipboard = (position) => {
        let delta = 0;
        for (const occurrence of existing) {
          const start = occurrence.offset - delta;
          const end = start + 1;
          if (position >= end) {
            delta += Math.max(0, occurrence.length - 1);
            continue;
          }
          if (position > start) return occurrence.offset;
          break;
        }
        return position + delta;
      };
      const detectEnd = draft.length - existing.reduce((sum, entry) => sum + Math.max(0, entry.length - 1), 0);
      const rawStart = span !== null && typeof span === 'object' && Number.isInteger(span.start) ? span.start : detectEnd;
      const rawStop = span !== null && typeof span === 'object' && Number.isInteger(span.end) ? span.end : rawStart;
      const detectStart = Math.min(Math.max(rawStart, 0), detectEnd);
      const detectStop = Math.min(Math.max(rawStop, detectStart), detectEnd);
      const start = detectToClipboard(detectStart);
      const end = detectToClipboard(detectStop);
      if (start < 0 || end < start || start > draft.length || end > draft.length) return null;

      let insert = marker;
      let insertAt = start;
      if (start > 0 && !/\s/u.test(draft.slice(start - 1, start))) {
        insert = ` ${insert}`;
        insertAt += 1;
      }
      const tail = draft.slice(end);
      if (tail === '' || !/^\s/u.test(tail)) insert += ' ';

      const shift = insert.length - (end - start);
      const references = [];
      for (const occurrence of existing) {
        if (occurrence.offset + occurrence.length <= start) {
          references.push(referenceEntry(occurrence));
        } else if (occurrence.offset >= end) {
          references.push({ ...referenceEntry(occurrence), offset: occurrence.offset + shift });
        }
        // A selection covering a chip drops it; normal caret insertion never
        // hits this branch.
      }
      references.push({
        source: 'action',
        ref: marker,
        offset: insertAt,
        length: marker.length,
        label: typeof label === 'string' && label !== '' ? label : marker,
        clipboardText: marker,
      });
      return {
        text: `${draft.slice(0, start)}${insert}${tail}`,
        references,
      };
    }

    function relativeTime(timestamp) {
      if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
      const delta = Date.now() - timestamp;
      if (delta < 60_000) return '刚刚';
      if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
      if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
      if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)} 天前`;
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatBytes(value) {
      const bytes = Number.isFinite(value) && value > 0 ? value : 0;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function bytesToBase64(bytes) {
      let binary = '';
      const chunk = 0x8000;
      for (let index = 0; index < bytes.length; index += chunk) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
      }
      return btoa(binary);
    }

    async function downloadZip(selection = undefined) {
      const ids = selection === undefined
        ? null
        : typeof selection === 'string' ? [selection] : [...selection];
      const suffix = ids === null ? '' : `?ids=${encodeURIComponent(ids.join(','))}`;
      const response = await fetch(`/api/dsh-action-hub/bundle/zip${suffix}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error((await response.text()).slice(0, 300));
      const disposition = response.headers.get('content-disposition') ?? '';
      const match = /filename\*=UTF-8''([^;]+)/iu.exec(disposition);
      const filename = match === null ? 'dsh-action-hub.zip' : decodeURIComponent(match[1]);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        /* fall through to the legacy path */
      }
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } finally {
        document.body.removeChild(area);
      }
      if (!ok) throw new Error('copy failed');
    }

    /* Search scoring: every token must match somewhere, and a name hit weighs far
       more than a body hit, so typing "code" lands on "Code review" first. */
    function searchScore(action, query) {
      const needle = typeof query === 'string' ? query.trim().toLowerCase() : '';
      if (needle === '') return 0;
      const tokens = needle.split(/\s+/);
      const name = (action.name || '').toLowerCase();
      const tags = (action.tags ?? []).join(' ').toLowerCase();
      const category = (action.category || '').toLowerCase();
      const description = (action.description || '').toLowerCase();
      const prompt = (action.prompt || '').toLowerCase();
      let total = 0;
      for (const token of tokens) {
        let best = -1;
        if (name === token) best = 120;
        else if (name.startsWith(token)) best = 100;
        else if (name.includes(token)) best = 80;
        else if (tags.includes(token)) best = 55;
        else if (category.includes(token)) best = 45;
        else if (description.includes(token)) best = 30;
        else if (prompt.includes(token)) best = 12;
        if (best < 0) return -1;
        total += best;
      }
      return total;
    }

    function usagePeriodKeys(now = new Date()) {
      const pad = (value) => String(value).padStart(2, '0');
      const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const offset = (now.getDay() + 6) % 7;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      const week = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      return { week, month };
    }

    function usageMetric(action, mode, keys) {
      const usage = action.usage ?? {};
      if (mode === 'week') return usage.week?.key === keys.week && Number.isFinite(usage.week?.count) ? usage.week.count : 0;
      if (mode === 'month') return usage.month?.key === keys.month && Number.isFinite(usage.month?.count) ? usage.month.count : 0;
      if (mode === 'total') return Number.isFinite(usage.count) ? usage.count : 0;
      return 0;
    }

    function sortActions(actions, sortBy = 'recent') {
      const keys = usagePeriodKeys();
      const usageMode = sortBy === 'week' || sortBy === 'month' || sortBy === 'total';
      return [...actions].sort((left, right) => {
        if ((left.pinned === true) !== (right.pinned === true)) return left.pinned === true ? -1 : 1;
        const builtin = (left.builtin === true ? 1 : 0) - (right.builtin === true ? 1 : 0);
        if (builtin !== 0) return builtin;
        if (sortBy === 'name') return (left.name || '').localeCompare(right.name || '', 'zh-CN');
        if (sortBy === 'created') return (right.createdAt ?? 0) - (left.createdAt ?? 0);
        if (usageMode) {
          const used = usageMetric(right, sortBy, keys) - usageMetric(left, sortBy, keys);
          if (used !== 0) return used;
        }
        const recent = (right.usage?.lastAt ?? 0) - (left.usage?.lastAt ?? 0);
        if (recent !== 0) return recent;
        return (left.name || '').localeCompare(right.name || '', 'zh-CN');
      });
    }

    function categoriesOf(actions) {
      const counts = new Map();
      for (const action of actions) {
        const name = action.category || '';
        if (name === '') continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      return [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'zh-CN'));
    }

    function visibleActions(actions, { query = '', category = '', uncategorized = false, sortBy = 'recent' } = {}) {
      const scored = [];
      for (const action of actions) {
        if (uncategorized) {
          if ((action.category || '') !== '') continue;
        } else if (category !== '' && (action.category || '') !== category) {
          continue;
        }
        const score = searchScore(action, query);
        if (score < 0) continue;
        scored.push({ action, score });
      }
      const keys = usagePeriodKeys();
      const usageMode = sortBy === 'week' || sortBy === 'month' || sortBy === 'total';
      scored.sort((left, right) => {
        const pinned = (right.action.pinned === true ? 1 : 0) - (left.action.pinned === true ? 1 : 0);
        if (pinned !== 0) return pinned;
        const builtin = (left.action.builtin === true ? 1 : 0) - (right.action.builtin === true ? 1 : 0);
        if (builtin !== 0) return builtin;
        if (left.score !== right.score) return right.score - left.score;
        if (sortBy === 'name') return (left.action.name || '').localeCompare(right.action.name || '', 'zh-CN');
        if (sortBy === 'created') return (right.action.createdAt ?? 0) - (left.action.createdAt ?? 0);
        if (usageMode) {
          const used = usageMetric(right.action, sortBy, keys) - usageMetric(left.action, sortBy, keys);
          if (used !== 0) return used;
        }
        const recent = (right.action.usage?.lastAt ?? 0) - (left.action.usage?.lastAt ?? 0);
        if (recent !== 0) return recent;
        return (left.action.name || '').localeCompare(right.action.name || '', 'zh-CN');
      });
      return scored.map((entry) => entry.action);
    }

    // ----------------------------------------------------------------- stores

    function createHub() {
      const listeners = new Set();
      let snapshot = {
        status: 'idle',
        actions: [],
        projects: [],
        projectScopes: [],
        groups: [],
        currentProject: null,
        currentProfile: null,
        meta: {},
        error: '',
      };
      let inflight = null;

      const emit = () => {
        for (const listener of [...listeners]) listener(snapshot);
      };
      const set = (next) => {
        snapshot = next;
        emit();
      };

      async function refresh(force = false) {
        if (inflight !== null && !force) return inflight;
        if (snapshot.status === 'idle' || snapshot.status === 'error') set({ ...snapshot, status: 'loading', error: '' });
        inflight = api('/state').then(
          (data) => {
            set({
              status: 'ready',
              actions: data.actions ?? [],
              projects: data.projects ?? [],
              projectScopes: data.projectScopes ?? [],
              groups: data.groups ?? [],
              currentProject: data.currentProject ?? null,
              currentProfile: data.currentProfile ?? null,
              meta: data.meta ?? {},
              error: '',
            });
            return snapshot;
          },
          (error) => {
            set({ ...snapshot, status: 'error', error: describeError(error) });
            throw error;
          },
        ).finally(() => {
          inflight = null;
        });
        return inflight;
      }

      async function call(route, body) {
        const data = await api(route, body);
        if (Array.isArray(data.actions)) set({ ...snapshot, status: 'ready', actions: data.actions, projects: data.projects ?? snapshot.projects, error: '' });
        else void refresh(true).catch(() => {});
        return data;
      }

      return {
        get: () => snapshot,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        refresh,
        call,
        patchAction(id, patch) {
          return call('/update', { id, patch });
        },
        dispose() {
          listeners.clear();
        },
      };
    }

    function useHub(hub) {
      const [snapshot, setSnapshot] = React.useState(() => hub.get());
      React.useEffect(() => hub.subscribe(setSnapshot), [hub]);
      React.useEffect(() => {
        if (hub.get().status === 'idle') void hub.refresh().catch(() => {});
      }, [hub]);
      return snapshot;
    }

    function createPrefs() {
      const defaults = { closeAfterInsert: true, showTrigger: true, showSidebarEntry: true };
      let current = defaults;
      try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        if (raw) current = { ...defaults, ...JSON.parse(raw) };
      } catch {
        current = defaults;
      }
      const listeners = new Set();
      return {
        get: () => current,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        set(patch) {
          current = { ...current, ...patch };
          try {
            window.localStorage.setItem(PREFS_KEY, JSON.stringify(current));
          } catch {
            /* storage may be unavailable; the in-memory value still applies */
          }
          for (const listener of [...listeners]) listener(current);
        },
      };
    }

    function usePrefs(prefs) {
      const [snapshot, setSnapshot] = React.useState(() => prefs.get());
      React.useEffect(() => prefs.subscribe(setSnapshot), [prefs]);
      return snapshot;
    }

    // ------------------------------------------------------------- shortcuts

    const DEFAULT_HOTKEY = { code: 'KeyA', modifiers: ['alt'] };

    function eventCode(event) {
      if (typeof event.code === 'string' && event.code !== '') return event.code;
      const key = typeof event.key === 'string' ? event.key : '';
      if (/^[a-z]$/iu.test(key)) return `Key${key.toUpperCase()}`;
      if (/^[0-9]$/u.test(key)) return `Digit${key}`;
      const names = {
        ' ': 'Space',
        Escape: 'Escape',
        Enter: 'Enter',
        Tab: 'Tab',
        Backspace: 'Backspace',
        ArrowUp: 'ArrowUp',
        ArrowDown: 'ArrowDown',
        ArrowLeft: 'ArrowLeft',
        ArrowRight: 'ArrowRight',
        Home: 'Home',
        End: 'End',
        '.': 'Period',
        ',': 'Comma',
        '/': 'Slash',
        ';': 'Semicolon',
        "'": 'Quote',
        '[': 'BracketLeft',
        ']': 'BracketRight',
        '\\': 'Backslash',
        '-': 'Minus',
        '=': 'Equal',
        '`': 'Backquote',
      };
      return names[key] ?? key;
    }

    function matchesBinding(event, binding) {
      const value = binding !== null && typeof binding === 'object' ? binding : DEFAULT_HOTKEY;
      const modifiers = Array.isArray(value.modifiers) ? value.modifiers : [];
      return eventCode(event) === value.code
        && Boolean(event.ctrlKey) === modifiers.includes('ctrl')
        && Boolean(event.altKey) === modifiers.includes('alt')
        && Boolean(event.shiftKey) === modifiers.includes('shift')
        && Boolean(event.metaKey) === modifiers.includes('meta');
    }

    /**
     * Register the command in the DSH shortcut registry so it appears (and can be
     * rebound) in Settings → General → Shortcuts. The Web registry refuses
     * Alt+A as a default, so on Web the command starts unbound and the plugin
     * handles Alt+A itself until the user assigns a registry binding; once they
     * do, the registry binding takes over.
     */
    function createShortcutStore(ctx, palette, t) {
      const service = typeof ctx?.get === 'function' ? ctx.get('shortcuts') : ctx?.shortcuts;
      const fallbackKeys = () => (MAC ? ['⌥', 'A'] : ['Alt', '+', 'A']);
      const fallbackManageKeys = () => (MAC ? ['⌘', '⌥', 'A'] : ['Ctrl', '+', 'Alt', '+', 'A']);
      const listeners = new Set();
      let state = {
        keys: fallbackKeys(),
        manageKeys: fallbackManageKeys(),
        aria: undefined,
        registered: false,
        available: service !== undefined,
      };
      let registrationOff = null;
      let manageRegistrationOff = null;
      let manualOff = null;
      let manageManualOff = null;
      let catalogOff = null;

      const emit = () => {
        for (const listener of [...listeners]) listener(state);
      };

      const togglePalette = () => {
        const current = (typeof window !== 'undefined' ? window.__dshActionHubPalette : undefined) ?? palette;
        const currentState = current.get();
        if (currentState.open) {
          current.close();
          return;
        }
        if (currentState.bridge === null) return;
        current.open();
      };

      const openManage = () => {
        palette.close();
        try {
          ctx.get('layout')?.selectPanel?.(PANEL_ID);
        } catch {
          /* the layout service is optional */
        }
      };

      const catalogRow = (id) => {
        try {
          const rows = service?.catalog?.getSnapshot?.();
          return Array.isArray(rows) ? rows.find((entry) => entry.id === id) : undefined;
        } catch {
          return undefined;
        }
      };

      const installManual = () => {
        if (manualOff !== null) return;
        const onKey = (event) => {
          if (!matchesBinding(event, DEFAULT_HOTKEY)) return;
          if (palette.get().bridge === null) return;
          event.preventDefault();
          event.stopPropagation();
          togglePalette();
        };
        document.addEventListener('keydown', onKey, true);
        manualOff = () => document.removeEventListener('keydown', onKey, true);
      };

      const manageBinding = () => (MAC ? { code: 'KeyA', modifiers: ['meta', 'alt'] } : { code: 'KeyA', modifiers: ['ctrl', 'alt'] });
      const installManageManual = () => {
        if (manageManualOff !== null) return;
        const onKey = (event) => {
          if (!matchesBinding(event, manageBinding())) return;
          if (typeof ctx?.get !== 'function') return;
          event.preventDefault();
          event.stopPropagation();
          openManage();
        };
        document.addEventListener('keydown', onKey, true);
        manageManualOff = () => document.removeEventListener('keydown', onKey, true);
      };

      const refresh = () => {
        const row = catalogRow('action-hub.palette');
        const manageRow = catalogRow('action-hub.manage');
        const bound = row !== undefined && Array.isArray(row.keys) && row.keys.length > 0;
        const manageBound = manageRow !== undefined && Array.isArray(manageRow.keys) && manageRow.keys.length > 0;
        if (bound) {
          manualOff?.();
          manualOff = null;
        } else {
          installManual();
        }
        if (manageBound) {
          manageManualOff?.();
          manageManualOff = null;
        } else {
          installManageManual();
        }
        state = {
          keys: bound ? row.keys : fallbackKeys(),
          manageKeys: manageBound ? manageRow.keys : fallbackManageKeys(),
          aria: row?.aria,
          registered: bound,
          available: service !== undefined,
        };
        emit();
      };

      const sync = () => {
        if (service === undefined || typeof service.register !== 'function') {
          installManual();
          refresh();
          return;
        }
        registrationOff?.();
        registrationOff = null;
        manageRegistrationOff?.();
        manageRegistrationOff = null;
        const defaults = {};
        for (const platform of ['macos', 'windows', 'linux']) {
          defaults[`desktop:${platform}`] = { code: 'KeyA', modifiers: ['alt'] };
        }
        try {
          registrationOff = service.register({
            id: 'action-hub.palette',
            label: () => t('shortcut.open'),
            aliases: ['action hub', 'actions', 'palette', '收藏夹'],
            defaults,
            regions: ['page', 'editable'],
            modals: [],
            resolve: () => ({ status: 'handled', run: togglePalette }),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.startsWith('Duplicate shortcut command')) {
            console.warn('[action-hub] shortcut registration failed, using a local listener:', error);
          }
        }
        try {
          manageRegistrationOff = service.register({
            id: 'action-hub.manage',
            label: () => t('shortcut.manage'),
            aliases: ['manage actions', 'action hub manage', '管理'],
            defaults: {},
            regions: ['page', 'editable'],
            modals: [],
            resolve: () => ({ status: 'handled', run: openManage }),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.startsWith('Duplicate shortcut command')) {
            console.warn('[action-hub] manage shortcut registration failed:', error);
          }
        }
        refresh();
      };

      const offCatalog = typeof service?.catalog?.subscribe === 'function'
        ? service.catalog.subscribe(() => refresh())
        : undefined;
      sync();

      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        sync,
        keysText: () => state.keys.join(''),
        dispose() {
          offCatalog?.();
          registrationOff?.();
          manageRegistrationOff?.();
          manualOff?.();
          manageManualOff?.();
          listeners.clear();
        },
      };
    }

    function useShortcutStore(store) {
      const [snapshot, setSnapshot] = React.useState(() => store.get());
      React.useEffect(() => store.subscribe(setSnapshot), [store]);
      return snapshot;
    }

    // Action reference chips: `/ah-...` is the wire spelling of an Action, but
    // the transcript shows the human name instead.
    const chipNames = new Map();

    function setChipNames(snapshot) {
      chipNames.clear();
      const handles = snapshot?.meta?.handles ?? {};
      for (const action of snapshot?.actions ?? []) {
        const handle = handles[action.id];
        if (typeof handle === 'string' && handle !== '') chipNames.set(handle, action.name);
      }
    }

    let referenceSourceOff = null;

    /**
     * Register the reference source that owns Action chips. The prompt
     * serializer routes every chip through its owner's codec; ours writes the
     * opaque `/ah-…` marker so the Host can expand it, while the chip keeps
     * showing the Action name.
     */
    function installActionReferenceSource(ctx) {
      if (referenceSourceOff !== null) return true;
      const inputTriggers = typeof ctx?.get === 'function' ? ctx.get('inputTriggers') : ctx?.inputTriggers;
      if (inputTriggers === undefined || typeof inputTriggers.registerSource !== 'function') {
        if (typeof ctx?.inject === 'function') {
          try {
            ctx.inject(['inputTriggers'], (child) => {
              installActionReferenceSource(child);
            });
          } catch (error) {
            console.warn('[action-hub] cannot wait for the input-trigger service:', error);
          }
        }
        return false;
      }
      try {
        referenceSourceOff = inputTriggers.registerSource({
          trigger: '/',
          name: 'action',
          // The pipeline always calls `.then()` on this result; a bare array
          // throws before later sources (commands, skills) are fetched.
          candidates: async () => [],
          onPick: () => undefined,
          codec: {
            clipboardText: (ref) => ref,
            serialize: async (ref) => ref,
          },
        });
        return true;
      } catch (error) {
        console.warn('[action-hub] reference source registration failed:', error);
        return false;
      }
    }

    const ACTION_MARKER_PATTERN = /(^|\s)\/(ah-[0-9a-f]{10})(?![0-9a-f])/gu;

    /**
     * Match one Action marker in a user message. A boundary is required before
     * the slash, but not after the handle: users often type immediately after
     * the chip, and the stored text then reads `/ah-…再测试一下`.
     *
     * @param {string} text
     * @param {number} from
     * @param {ReadonlyMap<string, string>} names
     * @returns {{ id: string, start: number, end: number, data: { name: string, handle: string } } | undefined}
     */
    function matchActionMarker(text, from, names) {
      ACTION_MARKER_PATTERN.lastIndex = from;
      for (let token = ACTION_MARKER_PATTERN.exec(text); token !== null; token = ACTION_MARKER_PATTERN.exec(text)) {
        const name = names.get(token[2]);
        if (name === undefined) continue;
        const start = token.index + token[1].length;
        return { id: 'action-hub', start, end: start + 1 + token[2].length, data: { name, handle: token[2] } };
      }
      return undefined;
    }

    let chipRuleInstalled = false;

    function installActionChipRule(ctx) {
      if (chipRuleInstalled) return true;
      const userText = typeof ctx?.get === 'function'
        ? ctx.get('uiConversation')?.userText
        : ctx?.uiConversation?.userText;
      if (userText === undefined || typeof userText.register !== 'function') {
        // The conversation service may activate after this row; wait for it once.
        if (typeof ctx?.inject === 'function') {
          try {
            ctx.inject(['uiConversation'], (child) => {
              installActionChipRule(child);
            });
          } catch (error) {
            console.warn('[action-hub] cannot wait for the conversation service:', error);
          }
        }
        return false;
      }
      try {
        userText.register({
          id: 'action-hub',
          order: 15,
          match(text, from) {
            return matchActionMarker(text, from, chipNames);
          },
        });
        chipRuleInstalled = true;
        return true;
      } catch (error) {
        console.warn('[action-hub] user-text rule registration failed:', error);
        return false;
      }
    }

    function createPalette() {
      const listeners = new Set();
      let state = {
        open: false,
        mode: 'browse',
        query: '',
        category: '',
        selectedId: null,
        args: '',
        toast: '',
        toastKind: 'ok',
        bridge: null,
      };
      const emit = () => {
        for (const listener of [...listeners]) listener(state);
      };
      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        update(patch) {
          state = { ...state, ...patch };
          emit();
        },
        setBridge(bridge) {
          state = { ...state, bridge };
          emit();
        },
        clearBridge(sessionId) {
          if (state.bridge !== null && state.bridge.sessionId !== sessionId) return;
          state = { ...state, bridge: null, open: false };
          emit();
        },
        open() {
          state = { ...state, open: true, mode: 'browse', query: '', category: '', args: '', toast: '', toastKind: 'ok' };
          emit();
        },
        close() {
          state = { ...state, open: false, mode: 'browse' };
          emit();
        },
        toggle() {
          if (state.open) {
            state = { ...state, open: false };
            emit();
          } else {
            state = { ...state, open: true, mode: 'browse', query: '', category: '', args: '', toast: '', toastKind: 'ok' };
            emit();
          }
        },
        toastMessage(text, kind = 'ok') {
          state = { ...state, toast: text, toastKind: kind };
          emit();
        },
      };
    }

    // ------------------------------------------------------------------ icons

    function iconSize(value, fallback = 16) {
      if (typeof value === 'number' && value > 0) return value;
      if (value !== null && typeof value === 'object' && typeof value.size === 'number' && value.size > 0) return value.size;
      return fallback;
    }

    function icon(paths, size = 16) {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: 'false',
        fill: 'none',
        style: { display: 'block' },
      }, paths.map((entry, index) => h('path', {
        key: index,
        d: entry.d,
        stroke: entry.fill ? undefined : 'currentColor',
        fill: entry.fill ?? 'none',
        strokeWidth: entry.fill ? undefined : 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      })));
    }

    const iconOf = (paths) => function IconComponent(props) {
      return icon(paths, iconSize(props));
    };

    const Icons = {
      shelf: iconOf([
        { d: 'M2.6 3.2h10.8v2.6H2.6z' },
        { d: 'M2.6 7.2h10.8v2.6H2.6z' },
        { d: 'M2.6 11.2h6.4v2.6H2.6z' },
      ]),
      search: iconOf([
        { d: 'M7 12.2a5.2 5.2 0 1 0 0-10.4 5.2 5.2 0 0 0 0 10.4z' },
        { d: 'M10.8 10.8 14 14' },
      ]),
      plus: iconOf([{ d: 'M8 3v10M3 8h10' }]),
      check: iconOf([{ d: 'M3.2 8.4l3 3 6.6-6.8' }]),
      close: iconOf([{ d: 'M4 4l8 8M12 4l-8 8' }]),
      star: function StarIcon(props) {
        const size = iconSize(props, 16);
        const filled = props !== null && typeof props === 'object' && props.filled === true;
        return h('svg', { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true, fill: 'none', style: { display: 'block' } },
          h('path', {
            d: 'M8 2.2l1.75 3.55 3.92.57-2.84 2.77.67 3.9L8 11.15l-3.5 1.84.67-3.9L2.33 6.32l3.92-.57L8 2.2z',
            stroke: 'currentColor',
            strokeWidth: 1.3,
            strokeLinejoin: 'round',
            fill: filled ? 'currentColor' : 'none',
          }));
      },
      edit: iconOf([{ d: 'M9.3 2.7l4 4L5.6 14.4H1.6v-4z' }, { d: 'M8.1 3.9l4 4' }]),
      copy: iconOf([{ d: 'M5.2 5.2h7.6v9H5.2z' }, { d: 'M3.2 10.8V1.8h7.6' }]),
      trash: iconOf([{ d: 'M2.6 4.2h10.8' }, { d: 'M6 4.2V2.6h4v1.6' }, { d: 'M4.2 4.2l.7 9.2h6.2l.7-9.2' }]),
      upload: iconOf([{ d: 'M8 10.5V2.6' }, { d: 'M5 5.4 8 2.4l3 3' }, { d: 'M2.6 10.8v2.2h10.8v-2.2' }]),
      download: iconOf([{ d: 'M8 2.6v7.9' }, { d: 'M5 7.6l3 3 3-3' }, { d: 'M2.6 10.8v2.2h10.8v-2.2' }]),
      arrow: iconOf([{ d: 'M2.8 8h10.4' }, { d: 'M9.4 4.2 13.2 8l-3.8 3.8' }]),
      send: iconOf([{ d: 'M2.4 8 14 2.4 11 13.6 7.6 9.2 2.4 8z' }, { d: 'M7.6 9.2 14 2.4' }]),
      folder: iconOf([{ d: 'M2.2 4.2h4l1.3 1.4h6.3v6.2H2.2z' }]),
      refresh: iconOf([{ d: 'M13 8a5 5 0 1 1-1.6-3.7' }, { d: 'M13.2 2.6v3.2H10' }]),
      sliders: iconOf([{ d: 'M2.6 4.6h10.8M2.6 8h10.8M2.6 11.4h10.8' }, { d: 'M5.2 3.2v2.8M10.8 6.6v2.8M6.6 10v2.8' }]),
    };

    function ActionUserChip(props) {
      const data = props?.node?.data ?? {};
      const name = typeof data.name === 'string' && data.name !== '' ? data.name : (data.handle ?? '');
      return h('span', { className: 'ah-user-chip', title: `/${data.handle ?? ''}` },
        h(Icons.shelf, { size: 11 }),
        h('span', { className: 'ah-user-chip-label' }, name));
    }

    // ------------------------------------------------------------- primitives

    function Button(props) {
      const classes = ['ah-btn'];
      if (props.primary) classes.push('ah-btn-primary');
      if (props.ghost) classes.push('ah-btn-ghost');
      if (props.danger) classes.push('ah-btn-danger');
      if (props.iconOnly) classes.push('ah-btn-icon');
      if (props.small) classes.push('ah-btn-sm', props.iconOnly ? 'ah-btn-sm' : '');
      return h('button', {
        type: 'button',
        className: classes.join(' ').trim(),
        onClick: props.onClick,
        disabled: props.disabled === true,
        title: props.title,
        'aria-label': props['aria-label'] ?? props.title,
        'aria-pressed': props.pressed,
        'data-active': props.active,
      }, props.children);
    }

    function SearchField(props) {
      return h('div', { className: 'ah-search' },
        h('span', { className: 'ah-search-mark' }, h(Icons.search, { size: 14 })),
        h('input', {
          ref: props.inputRef,
          value: props.value,
          placeholder: props.placeholder,
          'aria-label': props.placeholder,
          onChange: (event) => props.onChange(event.target.value),
          onKeyDown: props.onKeyDown,
        }));
    }

    function Modal(props) {
      const closeRef = React.useRef(props.onClose);
      closeRef.current = props.onClose;
      const panelRef = React.useRef(null);
      React.useEffect(() => {
        const previous = document.activeElement;
        const field = panelRef.current?.querySelector('input, textarea, select');
        if (field instanceof HTMLElement) field.focus();
        else if (panelRef.current instanceof HTMLElement) panelRef.current.focus();
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          closeRef.current();
        };
        document.addEventListener('keydown', onKey, true);
        return () => {
          document.removeEventListener('keydown', onKey, true);
          if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
        };
      }, []);
      return h('div', {
        className: 'ah-backdrop',
        onMouseDown: (event) => { if (event.target === event.currentTarget) props.onClose(); },
      },
      h('div', {
        className: props.wide ? 'ah-modal ah-modal-wide' : 'ah-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': props.title,
        tabIndex: -1,
        ref: panelRef,
      },
      h('div', { className: 'ah-modal-head' },
        props.head === undefined
          ? h('h2', { className: 'ah-modal-title' }, props.title)
          : props.head,
        h(Button, { ghost: true, iconOnly: true, small: true, onClick: props.onClose, title: props.t('action.close') }, h(Icons.close, { size: 13 }))),
      h('div', { className: 'ah-modal-body' }, props.children),
      props.footer === undefined ? null : h('div', { className: 'ah-modal-foot' }, props.footer)));
    }

    function Switch(props) {
      return h('button', {
        type: 'button',
        className: 'ah-switch',
        role: 'switch',
        'aria-checked': props.checked,
        'aria-label': props.label,
        onClick: () => props.onChange(!props.checked),
      });
    }

    function Kbd(props) {
      return h('span', { className: 'ah-kbd' }, props.children);
    }

    // ------------------------------------------------------------------ page

    function ActionRow(props) {
      const { action, t } = props;
      const used = action.usage?.count ?? 0;
      return h('div', {
        className: 'ah-row',
        role: 'button',
        tabIndex: 0,
        'aria-label': action.name,
        onClick: () => props.onOpen(action),
        onContextMenu: (event) => {
          event.preventDefault();
          props.onContextMenu(action, event);
        },
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            props.onOpen(action);
          }
        },
      },
      h('button', {
        type: 'button',
        className: 'ah-row-star',
        'data-on': action.pinned === true,
        title: action.pinned ? t('action.unpin') : t('action.pin'),
        'aria-label': action.pinned ? t('action.unpin') : t('action.pin'),
        'aria-pressed': action.pinned === true,
        onClick: (event) => {
          event.stopPropagation();
          props.onPin(action);
        },
      }, h(Icons.star, { size: 14, filled: action.pinned === true })),
      h('div', { className: 'ah-row-main' },
        h('div', { className: 'ah-row-title' },
          h('span', { className: 'ah-name' }, action.name),
          action.builtin === true && action.category !== '内置' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.builtin')) : null,
          action.category ? h('span', { className: 'ah-badge ah-badge-accent' }, action.category) : h('span', { className: 'ah-badge' }, t('lib.uncategorized')),
          action.mode === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : h('span', { className: 'ah-badge' }, t('lib.command')),
          (action.tags ?? []).slice(0, 3).map((tag) => h('span', { key: tag, className: 'ah-badge' }, `#${tag}`))),
        action.description ? h('p', { className: 'ah-desc' }, action.description) : null),
      h('div', { className: 'ah-row-actions' },
        h('span', { className: 'ah-meta' }, used > 0 ? t('lib.used', { count: used }) : t('lib.updated', { time: relativeTime(action.updatedAt) }))));
    }

    function renderResourceTree(resources, t, onPreview) {
      const root = { folders: new Map(), files: [] };
      for (const resource of resources) {
        const segments = resource.name.split('/');
        let node = root;
        for (const segment of segments.slice(0, -1)) {
          if (!node.folders.has(segment)) node.folders.set(segment, { folders: new Map(), files: [] });
          node = node.folders.get(segment);
        }
        node.files.push({ ...resource, leaf: segments[segments.length - 1] });
      }
      const rows = [];
      const walk = (node, depth) => {
        for (const name of [...node.folders.keys()].sort((left, right) => left.localeCompare(right))) {
          rows.push(h('div', { key: `d:${depth}:${name}:${rows.length}`, className: 'ah-tree-row', style: { paddingLeft: `${depth * 14}px` } },
            h(Icons.folder, { size: 12 }),
            h('span', { className: 'ah-tree-name' }, name)));
          walk(node.folders.get(name), depth + 1);
        }
        for (const file of [...node.files].sort((left, right) => left.leaf.localeCompare(right.leaf))) {
          rows.push(h('div', { key: `f:${file.name}`, className: 'ah-tree-row', style: { paddingLeft: `${depth * 14}px` } },
            h('button', { type: 'button', className: 'ah-resource-name', title: file.name, onClick: () => { void onPreview(file.name); } }, file.leaf),
            h('span', { className: 'ah-resource-size' }, formatBytes(file.bytes))));
        }
      };
      walk(root, 0);
      return rows;
    }

    function EditorDialog(props) {
      const { t, initial } = props;      const [form, setForm] = React.useState(() => ({
        name: initial?.name ?? '',
        category: initial?.category ?? '',
        tags: Array.isArray(initial?.tags) ? initial.tags.join(', ') : '',
        argsHint: initial?.argsHint ?? '',
        description: initial?.description ?? '',
        prompt: initial?.prompt ?? '',
        pinned: initial?.pinned === true,
        mode: initial?.mode === 'skill' ? 'skill' : 'command',
        groups: Array.isArray(initial?.groups) ? initial.groups : ['common'],
      }));
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [resources] = React.useState(() => (Array.isArray(initial?.resources) ? initial.resources : []));
      const [preview, setPreview] = React.useState(null);
      const patch = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

      const loadPreview = async (name) => {
        if (preview?.name === name) {
          setPreview(null);
          return;
        }
        if (initial?.id === undefined) return;
        try {
          const data = await api(`/resources?id=${encodeURIComponent(initial.id)}`);
          const file = (data.files ?? []).find((entry) => entry.name === name);
          setPreview(file ?? null);
        } catch (failure) {
          setError(describeError(failure));
        }
      };

      const save = async () => {
        if (form.name.trim() === '' || form.prompt.trim() === '') {
          setError(t('editor.required'));
          return;
        }
        setBusy(true);
        setError('');
        try {
          await props.onSave({
            name: form.name.trim(),
            category: form.category.trim(),
            tags: form.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag !== ''),
            argsHint: form.argsHint.trim(),
            description: form.description.trim(),
            prompt: form.prompt,
            pinned: form.pinned,
            mode: form.mode,
            groups: form.groups,
          });
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      const groups = Array.isArray(props.groups) ? props.groups : [];
      const toggleGroup = (id, checked) => {
        setForm((previous) => ({
          ...previous,
          groups: checked ? [...new Set([...previous.groups, id])] : previous.groups.filter((entry) => entry !== id),
        }));
      };

      return h(Modal, {
        title: initial === null ? t('editor.createTitle') : t('editor.editTitle'),
        t,
        onClose: props.onClose,
        footer: h(React.Fragment, null,
          h(Button, { onClick: props.onClose }, t('action.cancel')),
          h(Button, { primary: true, disabled: busy, onClick: save }, t('action.save'))),
      },
      h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('editor.name')),
        h('input', { className: 'ah-input', value: form.name, maxLength: 80, placeholder: t('editor.namePlaceholder'), onChange: patch('name') }),
        h('span', { className: 'ah-hint' }, t('editor.nameHint'))),
      h('div', { className: 'ah-field-row' },
        h('div', { className: 'ah-field' },
          h('label', { className: 'ah-label' }, t('editor.category')),
          h('input', { className: 'ah-input', value: form.category, maxLength: 40, list: 'ah-category-options', placeholder: t('editor.categoryPlaceholder'), onChange: patch('category') }),
          h('datalist', { id: 'ah-category-options' }, (props.categories ?? []).map((name) => h('option', { key: name, value: name }))),
          h('span', { className: 'ah-hint' }, t('editor.categoryHint'))),
        h('div', { className: 'ah-field' },
          h('label', { className: 'ah-label' }, t('editor.tags')),
          h('input', { className: 'ah-input', value: form.tags, placeholder: t('editor.tagsPlaceholder'), onChange: patch('tags') }),
          h('span', { className: 'ah-hint' }, t('editor.tagsHint')))),
      h('div', { className: 'ah-field-row' },
        h('div', { className: 'ah-field' },
          h('label', { className: 'ah-label' }, t('editor.description')),
          h('input', { className: 'ah-input', value: form.description, maxLength: 600, placeholder: t('editor.descriptionPlaceholder'), onChange: patch('description') }),
          h('span', { className: 'ah-hint' }, t('editor.descriptionHint'))),
        h('div', { className: 'ah-field' },
          h('label', { className: 'ah-label' }, t('editor.args')),
          h('input', { className: 'ah-input', value: form.argsHint, maxLength: 120, placeholder: t('editor.argsPlaceholder'), onChange: patch('argsHint') }),
          h('span', { className: 'ah-hint' }, t('editor.argsHint')))),
      h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('editor.prompt')),
        h('textarea', { className: 'ah-textarea', value: form.prompt, rows: 12, spellCheck: false, placeholder: t('editor.promptPlaceholder'), onChange: patch('prompt') }),
        h('span', { className: 'ah-hint' }, t('editor.promptHint'))),
      h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('editor.resources')),
        h('span', { className: 'ah-hint' }, initial?.id === undefined ? t('editor.resourceSaved') : t('editor.resourcesHint')),
        resources.length === 0
          ? (initial?.id === undefined ? null : h('span', { className: 'ah-hint' }, t('editor.resourcesEmpty')))
          : h('div', { className: 'ah-resource-list' }, renderResourceTree(resources, t, loadPreview)),
        preview === null ? null : h('pre', { className: 'ah-resource-preview' }, typeof preview.text === 'string' ? preview.text : t('editor.resourceEmptyText'))),
      h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('editor.mode')),
        h('select', { className: 'ah-input', value: form.mode, onChange: patch('mode') },
          h('option', { value: 'command' }, t('editor.modeCommand')),
          h('option', { value: 'skill' }, t('editor.modeSkill'))),
        h('span', { className: 'ah-hint' }, form.mode === 'skill' ? t('editor.modeSkillHint') : t('editor.modeCommandHint'))),
      h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('editor.groups')),
        h('div', { className: 'ah-scope-list' }, groups.map((group) => h('label', { key: group.id, className: 'ah-scope-option' },
          h('input', {
            type: 'checkbox',
            checked: form.groups.includes(group.id),
            onChange: (event) => toggleGroup(group.id, event.target.checked),
          }),
          ` ${group.name}`,
          group.builtin ? h('span', { className: 'ah-badge' }, t('editor.groupCommon')) : null))),
        h('span', { className: 'ah-hint' }, t('editor.groupsHint'))),
      h('div', { className: 'ah-settings-row' },
        h('div', { className: 'ah-settings-row-main' },
          h('span', { className: 'ah-settings-row-title' }, t('editor.pinned'))),
        h(Switch, { checked: form.pinned, label: t('editor.pinned'), onChange: (value) => setForm((previous) => ({ ...previous, pinned: value })) })),
      error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error));
    }

    function ImportDialog(props) {
      const { t, ctx } = props;
      const [bundleBusy, setBundleBusy] = React.useState(false);
      const [bundleError, setBundleError] = React.useState('');
      const [preview, setPreview] = React.useState(null);
      const [choices, setChoices] = React.useState({});
      const bundleRef = React.useRef(null);

      const openPlan = (kind, source, data) => {
        const initial = {};
        for (const item of data.items ?? []) initial[item.key] = item.defaultMode;
        setPreview({ kind, ...source, ...data });
        setChoices(initial);
        setBundleError('');
      };

      const previewBundleFolder = async () => {
        const workspace = typeof ctx?.get === 'function' ? ctx.get('uiWorkspace') : undefined;
        if (workspace === undefined || typeof workspace.pickDirectory !== 'function') {
          setBundleError(t('import.bundleUnavailable'));
          return;
        }
        const directory = await workspace.pickDirectory();
        if (directory === null) return;
        setBundleBusy(true);
        setBundleError('');
        try {
          const data = await api('/bundle/preview-folder', { path: directory });
          openPlan('folder', { path: directory }, data);
        } catch (failure) {
          setBundleError(describeError(failure));
        } finally {
          setBundleBusy(false);
        }
      };

      const previewBundleZip = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setBundleBusy(true);
        setBundleError('');
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const contentBase64 = bytesToBase64(bytes);
          const data = await api('/bundle/preview-zip', { contentBase64 });
          openPlan('zip', { contentBase64 }, data);
        } catch (failure) {
          setBundleError(describeError(failure));
        } finally {
          setBundleBusy(false);
        }
      };

      const confirmBundleImport = async () => {
        if (preview === null) return;
        const decisions = preview.items.map((item) => ({
          key: item.key,
          mode: choices[item.key] ?? item.defaultMode,
          fingerprint: item.fingerprint,
        }));
        setBundleBusy(true);
        setBundleError('');
        try {
          const endpoint = preview.kind === 'folder' ? '/bundle/import-folder' : '/bundle/import-zip';
          const payload = preview.kind === 'folder'
            ? { path: preview.path, decisions }
            : { contentBase64: preview.contentBase64, decisions };
          const data = await api(endpoint, payload);
          props.notify(t('import.bundleResult', {
            imported: data.imported ?? 0,
            updated: data.updated ?? 0,
            skipped: data.skipped ?? 0,
            duplicated: data.duplicated ?? 0,
            conflicts: data.conflicts ?? 0,
          }), 'ok');
          props.onDone();
          props.onClose();
        } catch (failure) {
          setBundleError(describeError(failure));
        } finally {
          setBundleBusy(false);
        }
      };

      const statusLabel = (status) => t(`import.status.${status}`);
      const modeLabel = (value) => t(`import.mode.${value}`);
      const summary = preview?.summary ?? null;

      const footer = preview !== null
        ? h(React.Fragment, null,
          h(Button, { disabled: bundleBusy, onClick: () => { setPreview(null); setChoices({}); setBundleError(''); } }, t('import.back')),
          h(Button, { primary: true, disabled: bundleBusy, onClick: confirmBundleImport }, t('import.confirm')))
        : h(Button, { onClick: props.onClose }, t('action.cancel'));

      const previewBody = preview === null ? null : h(React.Fragment, null,
        h('p', { className: 'ah-hint' }, t('import.previewHint', { source: preview.sourceLabel || '' })),
        summary === null ? null : h('div', { className: 'ah-import-summary' },
          h('span', null, t('import.summaryTotal', { total: summary.total })),
          h('span', { className: 'ah-import-stat' }, t('import.status.new'), summary.new),
          h('span', { className: 'ah-import-stat' }, t('import.status.duplicate'), summary.duplicate),
          h('span', { className: 'ah-import-stat' }, t('import.status.update'), summary.update),
          h('span', { className: 'ah-import-stat' }, t('import.status.conflict'), summary.conflict)),
        h('div', { className: 'ah-import-list' }, preview.items.map((item) => h('div', { key: item.key, className: 'ah-import-item' },
          h('div', { className: 'ah-import-main' },
            h('div', { className: 'ah-import-name' },
              h('span', { className: 'ah-import-title' }, item.name),
              h('span', { className: 'ah-import-badge', 'data-status': item.status }, statusLabel(item.status)),
              item.category ? h('span', { className: 'ah-badge ah-badge-accent' }, item.category) : null),
            item.description ? h('div', { className: 'ah-import-desc' }, item.description) : null,
            h('div', { className: 'ah-import-meta' },
              t('import.itemResources', { count: item.resources?.length ?? 0 }),
              item.target === null ? '' : ` · ${t('import.itemExisting', { name: item.target.name })}`,
              item.duplicateOf === null ? '' : ` · ${t('import.itemDuplicate', { name: item.duplicateOf.name })}`),
            item.status === 'conflict' ? h('div', { className: 'ah-import-warning' }, t('import.conflictHint')) : null),
          h('select', {
            className: 'ah-import-select',
            value: choices[item.key] ?? item.defaultMode,
            onChange: (event) => setChoices((current) => ({ ...current, [item.key]: event.target.value })),
          }, item.modes.map((value) => h('option', { key: value, value }, modeLabel(value))))))),
        bundleError === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, bundleError));

      const bundleBody = h(React.Fragment, null,
        h('p', { className: 'ah-hint' }, t('import.bundleHint')),
        h('div', { className: 'ah-field-row' },
          h(Button, { disabled: bundleBusy, onClick: previewBundleFolder }, h(Icons.folder, { size: 13 }), t('import.bundleFolder')),
          h(Button, { disabled: bundleBusy, onClick: () => bundleRef.current?.click() }, h(Icons.upload, { size: 13 }), t('import.bundleZip'))),
        h('input', { ref: bundleRef, type: 'file', accept: '.zip,application/zip', className: 'ah-hidden', onChange: previewBundleZip }),
        bundleError === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, bundleError));

      return h(Modal, {
        title: preview === null ? t('import.title') : t('import.previewTitle'),
        t,
        onClose: props.onClose,
        footer,
      }, preview === null ? bundleBody : previewBody);
    }

    function ExportDialog(props) {
      const { t, actions } = props;
      const [selected, setSelected] = React.useState(() => new Set(actions.map((action) => action.id)));
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');

      const toggle = (id) => {
        setSelected((previous) => {
          const next = new Set(previous);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      };

      const run = async () => {
        if (selected.size === 0) return;
        setBusy(true);
        setError('');
        try {
          await downloadZip([...selected]);
          props.notify(t('lib.exported'), 'ok');
          props.onClose();
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      return h(Modal, {
        title: t('export.title'),
        t,
        onClose: props.onClose,
        footer: h(React.Fragment, null,
          h(Button, { onClick: props.onClose }, t('action.cancel')),
          h(Button, { primary: true, disabled: busy || selected.size === 0, onClick: run }, t('export.run'))),
      },
      h('p', { className: 'ah-hint' }, t('export.hint')),
      h('div', { className: 'ah-export-list' }, actions.map((action) => h('label', { key: action.id, className: 'ah-export-item' },
        h('input', { type: 'checkbox', checked: selected.has(action.id), onChange: () => toggle(action.id) }),
        h('span', { className: 'ah-export-name' }, action.name),
        h('span', { className: 'ah-export-meta' }, action.category || t('lib.uncategorized'))))),
      h('div', { className: 'ah-field-row' },
        h(Button, { small: true, onClick: () => setSelected(new Set(actions.map((action) => action.id))) }, t('export.selectAll')),
        h(Button, { small: true, onClick: () => setSelected(new Set()) }, t('export.clear')),
        h('span', { className: 'ah-hint' }, t('export.selected', { count: selected.size, total: actions.length }))),
      error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error));
    }

    function CategoryDialog(props) {
      const { t } = props;
      const [renaming, setRenaming] = React.useState(null);
      const [draft, setDraft] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      const [pending, setPending] = React.useState(null);

      const submit = async () => {
        if (renaming === null) return;
        if (draft.trim() === '' || draft.trim() === renaming) {
          setRenaming(null);
          return;
        }
        setBusy(true);
        try {
          await api('/category/rename', { from: renaming, to: draft.trim() });
          props.notify(t('lib.saved'), 'ok');
          props.onDone();
          setRenaming(null);
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      const remove = async (name) => {
        setBusy(true);
        try {
          await api('/category/delete', { name });
          props.notify(t('lib.deleted'), 'ok');
          props.onDone();
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      const confirmDelete = async () => {
        if (pending === null) return;
        const name = pending;
        await remove(name);
        setPending(null);
      };

      const pendingCount = pending === null ? 0 : (props.counts?.[pending] ?? 0);
      const confirmBlock = pending === null ? null : h('div', { className: 'ah-notice', 'data-kind': 'warn', role: 'alert' },
        h('p', { style: { margin: '0 0 4px', fontWeight: 600 } }, t('category.deleteConfirm', { name: pending })),
        h('p', { style: { margin: '0 0 8px' } }, pendingCount > 0 ? t('category.deleteConfirmDesc', { count: pendingCount }) : t('category.deleteConfirmEmpty')),
        h('div', { className: 'ah-actions' },
          h('div', { style: { flex: '1 1 auto' } }),
          h(Button, { small: true, onClick: () => setPending(null) }, t('action.cancel')),
          h(Button, { small: true, danger: true, disabled: busy, onClick: () => { void confirmDelete(); } }, t('category.confirmDelete'))));

      return h(Modal, { title: t('category.title'), t, onClose: props.onClose, footer: h(Button, { onClick: props.onClose }, t('action.cancel')) },
        confirmBlock,
        props.categories.length === 0
          ? h('div', { className: 'ah-notice' }, t('category.empty'))
          : h('div', { className: 'ah-list-plain' }, props.categories.map((name) => h('div', { key: name, className: 'ah-plain-item' },
            h('div', { className: 'ah-plain-main' },
              renaming === name
                ? h('input', {
                  className: 'ah-input',
                  value: draft,
                  autoFocus: true,
                  'aria-label': t('category.name'),
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown: (event) => { if (event.key === 'Enter') void submit(); },
                })
                : h('span', { className: 'ah-plain-name' }, name)),
            renaming === name
              ? h(React.Fragment, null,
                h(Button, { small: true, primary: true, disabled: busy, onClick: submit }, t('action.save')),
                h(Button, { small: true, ghost: true, onClick: () => setRenaming(null) }, t('action.cancel')))
              : h(React.Fragment, null,
                h(Button, { small: true, onClick: () => { setRenaming(name); setDraft(name); } }, t('category.rename')),
                h(Button, { small: true, danger: true, disabled: busy, onClick: () => setPending(name) }, t('category.delete')))))),
        error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error));
    }

    function createPage(hub, ctx) {
      return function ActionHubPage(props) {
        const t = translate(props);
        const snapshot = useHub(hub);
        const [query, setQuery] = React.useState('');
        const [category, setCategory] = React.useState('');
        const [uncategorized, setUncategorized] = React.useState(false);
        const [sortBy, setSortBy] = React.useState('recent');
        const [editor, setEditor] = React.useState(undefined); // undefined closed, null create
        const [detail, setDetail] = React.useState(null);
        const [deleting, setDeleting] = React.useState(null);
        const [importing, setImporting] = React.useState(false);
        const [exporting, setExporting] = React.useState(false);
        const [categoryDialog, setCategoryDialog] = React.useState(false);
        const [configOpen, setConfigOpen] = React.useState(false);
        const [configTab, setConfigTab] = React.useState('groups');
        const [menu, setMenu] = React.useState(null);
        const [notice, setNotice] = React.useState({ text: '', kind: '' });

        React.useEffect(() => {
          if (menu === null) return undefined;
          const close = () => setMenu(null);
          const onKey = (event) => { if (event.key === 'Escape') setMenu(null); };
          document.addEventListener('mousedown', close);
          document.addEventListener('keydown', onKey);
          return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
          };
        }, [menu]);

        const notify = React.useCallback((text, kind = 'ok') => setNotice({ text, kind }), []);
        React.useEffect(() => {
          if (notice.text === '') return undefined;
          const timer = setTimeout(() => setNotice({ text: '', kind: '' }), 3200);
          return () => clearTimeout(timer);
        }, [notice]);

        const actions = snapshot.actions ?? [];
        const categories = React.useMemo(() => categoriesOf(actions), [actions]);
        React.useEffect(() => {
          const timer = setInterval(() => {
            let startedAt = 0;
            try {
              startedAt = Number(localStorage.getItem('action-hub.aiAssistAt') ?? 0);
            } catch {
              startedAt = 0;
            }
            if (Date.now() - startedAt < 10 * 60 * 1000) {
              void hub.refresh(true).catch(() => {});
            }
          }, 4000);
          return () => clearInterval(timer);
        }, [hub]);
        const visible = React.useMemo(
          () => (uncategorized
            ? visibleActions(actions, { query, uncategorized: true, sortBy })
            : visibleActions(actions, { query, category, sortBy })),
          [actions, category, query, sortBy, uncategorized],
        );

        const save = async (form) => {
          if (editor === null) await hub.call('/create', { action: form });
          else await hub.call('/update', { id: editor.id, patch: form });
          notify(t('lib.saved'), 'ok');
          setEditor(undefined);
        };

        const remove = async () => {
          if (deleting === null) return;
          try {
            await hub.call('/delete', { id: deleting.id });
            notify(t('lib.deleted'), 'ok');
          } catch (failure) {
            notify(describeError(failure), 'error');
          } finally {
            setDeleting(null);
            setDetail(null);
          }
        };

        const togglePin = async (action) => {
          try {
            await hub.patchAction(action.id, { pinned: action.pinned !== true });
            notify(action.pinned ? t('lib.unpinned') : t('lib.pinned'), 'ok');
          } catch (failure) {
            notify(describeError(failure), 'error');
          }
        };

        const toggleMode = async (action) => {
          const next = action.mode === 'skill' ? 'command' : 'skill';
          try {
            await hub.call('/mode', { id: action.name, mode: next });
            notify(next === 'skill' ? t('lib.modeSkill') : t('lib.modeCommand'), 'ok');
          } catch (failure) {
            notify(describeError(failure), 'error');
          }
        };


        const navItems = [];
        navItems.push(h('button', {
          key: '__all',
          type: 'button',
          className: 'ah-nav-item',
          'data-active': category === '' && !uncategorized,
          onClick: () => { setCategory(''); setUncategorized(false); },
        }, h('span', { className: 'ah-nav-name' }, t('lib.all')), h('span', { className: 'ah-nav-count' }, actions.length)));
        for (const [name, count] of categories) {
          navItems.push(h('button', {
            key: name,
            type: 'button',
            className: 'ah-nav-item',
            'data-active': category === name && !uncategorized,
            onClick: () => { setCategory(name); setUncategorized(false); },
          }, h('span', { className: 'ah-nav-name' }, name), h('span', { className: 'ah-nav-count' }, count)));
        }
        const unclassified = actions.filter((action) => (action.category || '') === '').length;
        if (unclassified > 0) {
          navItems.push(h('button', {
            key: '__none',
            type: 'button',
            className: 'ah-nav-item',
            'data-active': uncategorized,
            onClick: () => { setUncategorized(true); setCategory(''); },
          }, h('span', { className: 'ah-nav-name' }, t('lib.uncategorized')), h('span', { className: 'ah-nav-count' }, unclassified)));
        }

        const sortLabels = {
          recent: t('lib.sortRecent'),
          name: t('lib.sortName'),
          created: t('lib.sortCreated'),
          week: t('lib.sortWeek'),
          month: t('lib.sortMonth'),
          total: t('lib.sortTotal'),
        };

        const body = [];
        body.push(h('header', { key: 'head', className: 'ah-head' },
          h('div', { className: 'ah-head-main' },
            h('h1', { className: 'ah-title' }, t('app.title')),
            h('p', { className: 'ah-sub' }, t('app.subtitle'))),
          h('div', { className: 'ah-head-actions' },
            h(Button, { primary: true, onClick: () => setEditor(null) }, h(Icons.plus, { size: 14 }), t('action.new')),
            h(Button, { onClick: () => setImporting(true) }, h(Icons.upload, { size: 13 }), t('action.import')),
            h(Button, { onClick: () => { setConfigTab('groups'); setConfigOpen(true); } }, h(Icons.sliders, { size: 13 }), t('action.groups')),
            h(Button, { onClick: () => { setConfigTab('scope'); setConfigOpen(true); } }, h(Icons.shelf, { size: 13 }), t('action.scopes')),
            h(Button, { onClick: () => setExporting(true) }, h(Icons.download, { size: 13 }), t('action.export')),
            h(Button, { ghost: true, iconOnly: true, title: t('action.refresh'), onClick: () => { void hub.refresh(true).catch(() => {}); } }, h(Icons.refresh, { size: 14 })))));

        body.push(h('div', { key: 'body', className: 'ah-body' },
          h('nav', { className: 'ah-nav', 'aria-label': t('lib.categories') },
            h('div', { className: 'ah-nav-label' }, t('lib.categories')),
            h('div', { className: 'ah-nav-list' }, navItems),
            h('div', { className: 'ah-nav-foot' },
              h(Button, { ghost: true, onClick: () => setCategoryDialog(true) }, h(Icons.sliders, { size: 13 }), t('lib.manageCategories')))),
          h('div', { className: 'ah-main' },
            h('div', { className: 'ah-main-bar' },
              h(SearchField, { value: query, placeholder: t('lib.search'), onChange: setQuery }),
              h('div', { className: 'ah-sort' },
                h('span', { className: 'ah-count' }, `${t('lib.sortLabel')}:`),
                Object.entries(sortLabels).map(([value, label]) => h('button', {
                  key: value,
                  type: 'button',
                  className: 'ah-chip',
                  'data-active': sortBy === value,
                  onClick: () => setSortBy(value),
                }, label))),
              h('span', { className: 'ah-count' }, query === '' && category === '' && !uncategorized
                ? t('lib.count', { count: actions.length })
                : t('lib.countFiltered', { count: visible.length, total: actions.length }))),
            snapshot.status === 'loading' && actions.length === 0
              ? h('div', { className: 'ah-empty' }, h('div', { className: 'ah-empty-title' }, t('lib.loading')))
              : snapshot.status === 'error' && actions.length === 0
                ? h('div', { className: 'ah-empty' },
                  h('div', { className: 'ah-empty-title' }, t('lib.loadFailed', { error: snapshot.error })),
                  h(Button, { primary: true, onClick: () => { void hub.refresh(true).catch(() => {}); } }, t('lib.retry')))
                : visible.length === 0
                  ? h('div', { className: 'ah-empty' },
                    h('div', { className: 'ah-empty-icon' }, h(Icons.shelf, { size: 30 })),
                    h('div', { className: 'ah-empty-title' }, actions.length === 0 ? t('lib.emptyTitle') : t('lib.emptyFiltered')),
                    h('div', { className: 'ah-empty-copy' }, actions.length === 0 ? t('lib.emptyCopy') : ''),
                    actions.length === 0
                      ? h('div', { className: 'ah-empty-actions' }, h(Button, { primary: true, onClick: () => setEditor(null) }, h(Icons.plus, { size: 14 }), t('lib.emptyCta')))
                      : null)
                  : h('div', { className: 'ah-list' }, visible.map((action) => h(ActionRow, {
                    key: action.id,
                    action,
                    t,
                    onOpen: setDetail,
                    onPin: togglePin,
                    onEdit: (entry) => setEditor(entry),
                    onDelete: setDeleting,
                    onContextMenu: (entry, event) => {
                      setMenu({
                        action: entry,
                        x: Math.min(event.clientX, window.innerWidth - 180),
                        y: Math.min(event.clientY, window.innerHeight - 150),
                      });
                    },
                  }))))));

        if (editor !== undefined) {
          body.push(h(EditorDialog, {
            key: 'editor',
            initial: editor,
            categories: categories.map(([name]) => name),
            projects: snapshot.projects ?? [],
            groups: snapshot.groups ?? [],
            t,
            onSave: save,
            onClose: () => setEditor(undefined),
          }));
        }
        if (configOpen) {
          body.push(h(ConfigDialog, {
            key: 'config',
            initialTab: configTab,
            projects: snapshot.projects ?? [],
            projectScopes: snapshot.projectScopes ?? [],
            groups: snapshot.groups ?? [],
            actions,
            currentProject: snapshot.currentProject ?? null,
            t,
            onChanged: () => hub.refresh(true),
            onClose: () => setConfigOpen(false),
          }));
        }
        if (detail !== null) {
          body.push(h(Modal, {
            key: 'detail',
            title: detail.name,
            t,
            onClose: () => setDetail(null),
            footer: h(React.Fragment, null,
              h(Button, { onClick: async () => { try { await copyText(detail.prompt); notify(t('lib.copied'), 'ok'); } catch { notify(t('lib.copyFailed'), 'error'); } } }, h(Icons.copy, { size: 13 }), t('action.copy')),
              detail.builtin === true ? null : h(Button, { onClick: async () => { try { await downloadZip(detail.id); notify(t('lib.exported'), 'ok'); } catch (failure) { notify(describeError(failure), 'error'); } } }, h(Icons.download, { size: 13 }), t('lib.exportOne')),
              detail.builtin === true ? null : h(Button, { onClick: () => { setEditor(detail); setDetail(null); } }, h(Icons.edit, { size: 13 }), t('action.edit')),
              detail.builtin === true ? null : h(Button, { danger: true, onClick: () => setDeleting(detail) }, h(Icons.trash, { size: 13 }), t('action.delete'))),
          },
          h('div', { className: 'ah-preview-meta' },
            detail.builtin === true && detail.category !== '内置' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.builtin')) : null,
            detail.category ? h('span', { className: 'ah-badge ah-badge-accent' }, detail.category) : h('span', { className: 'ah-badge' }, t('lib.uncategorized')),
            detail.pinned ? h('span', { className: 'ah-badge ah-badge-warn' }, t('palette.pinned')) : null,
            detail.mode === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : h('span', { className: 'ah-badge' }, t('lib.command')),
            (detail.groups ?? []).map((id) => {
              const group = (snapshot.groups ?? []).find((entry) => entry.id === id);
              return group === undefined ? null : h('span', { key: id, className: 'ah-badge' }, group.name);
            }),
            (detail.tags ?? []).map((tag) => h('span', { key: tag, className: 'ah-badge' }, `#${tag}`)),
            (detail.resources ?? []).length > 0 ? h('span', { className: 'ah-badge' }, t('palette.resourceCount', { count: detail.resources.length })) : null,
            h('span', { className: 'ah-count' }, detail.usage?.count > 0 ? t('lib.used', { count: detail.usage.count }) : t('lib.updated', { time: relativeTime(detail.updatedAt) }))),
          detail.description ? h('p', { className: 'ah-desc' }, detail.description) : null,
          h('pre', { className: 'ah-code' }, detail.prompt),
          (detail.resources ?? []).length > 0
            ? h('div', { className: 'ah-field' },
              h('label', { className: 'ah-label' }, t('editor.resources')),
              h('div', { className: 'ah-resource-list' }, detail.resources.map((resource) => h('div', { key: resource.name, className: 'ah-resource-item' },
                h('span', { className: 'ah-resource-name' }, resource.name),
                h('span', { className: 'ah-resource-size' }, formatBytes(resource.bytes))))))
            : null,
          h('p', { className: 'ah-hint' }, t('lib.useInChat'))));
        }
        if (deleting !== null) {
          body.push(h(Modal, {
            key: 'delete',
            title: t('delete.title'),
            t,
            onClose: () => setDeleting(null),
            footer: h(React.Fragment, null,
              h(Button, { onClick: () => setDeleting(null) }, t('action.cancel')),
              h(Button, { danger: true, onClick: remove }, t('action.deleteForever'))),
          }, h('p', { className: 'ah-desc' }, t('delete.copy', { name: deleting.name }))));
        }
        if (exporting) {
          body.push(h(ExportDialog, {
            key: 'export',
            t,
            actions: actions.filter((action) => action.builtin !== true),
            notify,
            onClose: () => setExporting(false),
          }));
        }
        if (importing) {
          body.push(h(ImportDialog, {
            key: 'import',
            t,
            ctx,
            notify,
            onClose: () => setImporting(false),
            onDone: () => { void hub.refresh(true).catch(() => {}); },
          }));
        }
        if (categoryDialog) {
          body.push(h(CategoryDialog, {
            key: 'categories',
            t,
            categories: categories.map(([name]) => name),
            counts: Object.fromEntries(categories),
            notify,
            onClose: () => setCategoryDialog(false),
            onDone: () => { void hub.refresh(true).catch(() => {}); },
          }));
        }

        if (menu !== null) {
          const action = menu.action;
          body.push(h('div', {
            key: 'menu',
            className: 'ah-group-context',
            style: { left: `${menu.x}px`, top: `${menu.y}px` },
            onMouseDown: (event) => event.stopPropagation(),
          },
          h('button', {
            type: 'button',
            className: 'ah-group-context-item',
            onClick: () => { setMenu(null); void toggleMode(action); },
          }, action.mode === 'skill' ? t('action.switchToCommand') : t('action.switchToSkill')),
          action.builtin === true ? null : h('button', {
            type: 'button',
            className: 'ah-group-context-item',
            onClick: () => { setMenu(null); setEditor(action); },
          }, t('action.edit')),
          action.builtin === true ? null : h('button', {
            type: 'button',
            className: 'ah-group-context-item',
            'data-danger': 'true',
            onClick: () => { setMenu(null); setDeleting(action); },
          }, t('action.delete'))));
        }

        if (notice.text !== '') body.push(h('div', { key: 'notice', className: 'ah-toast', 'data-kind': notice.kind, role: 'status', 'aria-live': 'polite' }, notice.text));

        return h('div', { className: 'ah-page' }, body);
      };
    }

    // -------------------------------------------------------- groups & scopes

    function ActionCheck(props) {
      return h(React.Fragment, null,
        h('input', {
          type: 'checkbox',
          className: 'ah-action-input',
          checked: props.checked,
          disabled: props.disabled === true,
          ref: (node) => { if (node !== null) node.indeterminate = props.state === 'inherited'; },
          onChange: props.onChange,
        }),
        h('span', { className: 'ah-action-check', 'data-state': props.state, 'aria-hidden': true },
          props.state === 'off' ? null : h(Icons.check, { size: 10 })));
    }

    function GroupDialog(props) {
      const { t } = props;
      const groups = Array.isArray(props.groups) ? props.groups : [];
      const actions = Array.isArray(props.actions) ? props.actions : [];
      const [name, setName] = React.useState('');
      const [selectedId, setSelectedId] = React.useState(() => groups[0]?.id ?? '');
      const [drafts, setDrafts] = React.useState({});
      const [query, setQuery] = React.useState('');
      const [filter, setFilter] = React.useState('all');
      const [renamingId, setRenamingId] = React.useState('');
      const [renameValue, setRenameValue] = React.useState('');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [menu, setMenu] = React.useState(null);

      React.useEffect(() => {
        if (menu === null) return undefined;
        const close = () => setMenu(null);
        const onKey = (event) => { if (event.key === 'Escape') setMenu(null); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        return () => {
          document.removeEventListener('mousedown', close);
          document.removeEventListener('keydown', onKey);
        };
      }, [menu]);

      const active = groups.find((group) => group.id === selectedId) ?? groups[0] ?? null;
      const originalNames = (group) => actions.filter((action) => (action.groups ?? []).includes(group.id)).map((action) => action.name);
      const originalIncludes = (group) => (Array.isArray(group.includes) ? group.includes : []);
      const draftNames = (group) => drafts[group.id]?.actions ?? originalNames(group);
      const draftIncludes = (group) => drafts[group.id]?.includes ?? originalIncludes(group);
      const namesFor = (groupId, seen = new Set()) => {
        const names = new Set();
        if (typeof groupId !== 'string' || groupId === '' || seen.has(groupId)) return names;
        seen.add(groupId);
        const group = groups.find((entry) => entry.id === groupId);
        if (group === undefined) return names;
        for (const name of draftNames(group)) names.add(name);
        for (const child of draftIncludes(group)) {
          for (const name of namesFor(child, seen)) names.add(name);
        }
        return names;
      };
      const activeDirect = active === null ? [] : draftNames(active);
      const activeDirectSet = new Set(activeDirect);
      const activeIncludes = active === null ? [] : draftIncludes(active);
      const activeEffective = active === null ? new Set() : namesFor(active.id);
      const inheritedNames = new Set([...activeEffective].filter((entry) => !activeDirectSet.has(entry)));
      const reachesGroup = (from, target, seen = new Set()) => {
        if (from === target) return true;
        if (typeof from !== 'string' || seen.has(from)) return false;
        seen.add(from);
        const group = groups.find((entry) => entry.id === from);
        return (group === undefined ? [] : draftIncludes(group)).some((child) => reachesGroup(child, target, seen));
      };
      const dirtyGroups = groups.filter((group) => {
        const before = originalNames(group);
        const after = draftNames(group);
        const beforeIncludes = originalIncludes(group);
        const afterIncludes = draftIncludes(group);
        return before.length !== after.length
          || before.some((entry) => !after.includes(entry))
          || beforeIncludes.length !== afterIncludes.length
          || beforeIncludes.some((entry) => !afterIncludes.includes(entry));
      });
      const dirtyCount = dirtyGroups.reduce((sum, group) => {
        const before = originalNames(group);
        const after = draftNames(group);
        const added = after.filter((entry) => !before.includes(entry)).length;
        const removed = before.filter((entry) => !after.includes(entry)).length;
        const beforeIncludes = originalIncludes(group);
        const afterIncludes = draftIncludes(group);
        const includesAdded = afterIncludes.filter((entry) => !beforeIncludes.includes(entry)).length;
        const includesRemoved = beforeIncludes.filter((entry) => !afterIncludes.includes(entry)).length;
        return sum + added + removed + includesAdded + includesRemoved;
      }, 0);
      React.useEffect(() => {
        props.onDirtyChange?.(dirtyCount);
      }, [dirtyCount, props.onDirtyChange]);
      const filtered = actions.filter((action) => {
        if (filter === 'selected' && !activeDirectSet.has(action.name)) return false;
        if (filter === 'unselected' && activeDirectSet.has(action.name)) return false;
        if (query.trim() === '') return true;
        return `${action.name} ${action.description} ${(action.tags ?? []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
      });
      const groupLabel = (id) => groups.find((group) => group.id === id)?.name ?? id;

      const refresh = async () => {
        await props.onChanged?.();
      };
      const run = async (task) => {
        setBusy(true);
        setError('');
        try {
          await task();
          await refresh();
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };
      const close = () => {
        if (!props.embedded && dirtyCount > 0 && !window.confirm(t('groups.discard', { count: dirtyCount }))) return;
        props.onClose?.();
      };
      const toggle = (action) => {
        if (active === null) return;
        const next = activeDirectSet.has(action.name)
          ? activeDirect.filter((entry) => entry !== action.name)
          : [...activeDirect, action.name];
        setDrafts((previous) => ({ ...previous, [active.id]: { actions: next, includes: activeIncludes } }));
      };
      const toggleInclude = (child, checked) => {
        if (active === null) return;
        const next = checked ? [...new Set([...activeIncludes, child.id])] : activeIncludes.filter((entry) => entry !== child.id);
        setDrafts((previous) => ({ ...previous, [active.id]: { actions: activeDirect, includes: next } }));
      };
      const setFiltered = (checked) => {
        if (active === null) return;
        const names = new Set(activeDirect);
        for (const action of filtered) {
          if (checked) names.add(action.name);
          else names.delete(action.name);
        }
        setDrafts((previous) => ({ ...previous, [active.id]: { actions: [...names], includes: activeIncludes } }));
      };
      const save = async () => {
        setBusy(true);
        setError('');
        try {
          for (const group of dirtyGroups) {
            const actionsChanged = originalNames(group).length !== draftNames(group).length
              || originalNames(group).some((entry) => !draftNames(group).includes(entry));
            const includesChanged = originalIncludes(group).length !== draftIncludes(group).length
              || originalIncludes(group).some((entry) => !draftIncludes(group).includes(entry));
            if (actionsChanged) await api('/groups/actions', { id: group.id, actions: draftNames(group) });
            if (includesChanged) await api('/groups/includes', { id: group.id, includes: draftIncludes(group) });
          }
          await refresh();
          if (!props.embedded) props.onClose?.();
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };
      const createGroup = async () => {
        await run(async () => {
          const result = await api('/groups/create', { name: name.trim() });
          setName('');
          setSelectedId(result.group.id);
        });
      };
      const startRename = (group) => {
        setRenamingId(group.id);
        setRenameValue(group.name);
      };
      const commitRename = async (group) => {
        const next = renameValue.trim();
        if (next === '' || next === group.name) {
          setRenamingId('');
          return;
        }
        await run(async () => {
          await api('/groups/rename', { id: group.id, name: next });
          setRenamingId('');
        });
      };
      const removeGroup = async (group) => {
        if (!window.confirm(t('groups.deleteConfirm', { name: group.name }))) return;
        await run(async () => {
          await api('/groups/delete', { id: group.id });
          setDrafts((previous) => {
            const next = { ...previous };
            delete next[group.id];
            return next;
          });
          if (selectedId === group.id) setSelectedId('');
        });
      };

      const groupRows = groups.map((group) => {
        const renaming = renamingId === group.id;
        const titleRow = h('div', { className: 'ah-group-item-main' },
          h('span', { className: 'ah-group-name' }, group.name),
          group.builtin ? h('span', { className: 'ah-badge' }, t('groups.defaultBadge')) : null);
        const body = renaming
          ? h('div', { className: 'ah-group-rename' },
            h('input', {
              className: 'ah-input',
              value: renameValue,
              autoFocus: true,
              onChange: (event) => setRenameValue(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') { event.preventDefault(); void commitRename(group); }
                if (event.key === 'Escape') setRenamingId('');
              },
            }),
            h(Button, { small: true, primary: true, onClick: () => void commitRename(group) }, t('action.save')),
            h(Button, { small: true, onClick: () => setRenamingId('') }, t('action.cancel')))
          : h(React.Fragment, null, titleRow,
            h('span', { className: 'ah-group-count' }, t('groups.actionCount', { count: namesFor(group.id).size })));
        return h('div', {
          key: group.id,
          className: 'ah-group-item',
          'data-active': group.id === active?.id,
          onClick: () => { if (!renaming) setSelectedId(group.id); },
          onContextMenu: (event) => {
            event.preventDefault();
            if (group.builtin) return;
            setSelectedId(group.id);
            setMenu({
              id: group.id,
              x: Math.min(event.clientX, window.innerWidth - 160),
              y: Math.min(event.clientY, window.innerHeight - 90),
            });
          },
        }, body);
      });


      const effectiveGroupIds = (groupId, seen = new Set()) => {
        const out = new Set();
        if (typeof groupId !== 'string' || groupId === '' || seen.has(groupId)) return out;
        seen.add(groupId);
        out.add(groupId);
        const group = groups.find((entry) => entry.id === groupId);
        for (const child of group === undefined ? [] : draftIncludes(group)) {
          for (const id of effectiveGroupIds(child, seen)) out.add(id);
        }
        return out;
      };
      const activeEffectiveGroups = active === null ? new Set() : effectiveGroupIds(active.id);
      const childGroups = active === null ? [] : groups.filter((group) => group.id !== active.id);
      const includesBlock = active === null ? null : h('div', { className: 'ah-group-includes' },
        h('div', { className: 'ah-group-section-label' }, t('groups.includesTitle')),
        h('p', { className: 'ah-hint' }, t('groups.includesHint')),
        h('div', { className: 'ah-group-include-list' }, childGroups.map((child) => {
          const checked = activeIncludes.includes(child.id);
          const effective = !checked && activeEffectiveGroups.has(child.id);
          const cycle = !checked && !effective && reachesGroup(child.id, active.id);
          return h('label', {
            key: child.id,
            className: 'ah-group-include',
            'data-checked': checked,
            'data-effective': effective,
            'data-cycle': cycle,
            title: effective ? t('groups.effectiveHint') : undefined,
          },
          h('input', {
            type: 'checkbox',
            checked,
            disabled: busy,
            onChange: (event) => toggleInclude(child, event.target.checked),
          }),
          h('span', { className: 'ah-group-include-name' }, child.name),
          h('span', { className: 'ah-count' }, t('groups.actionCount', { count: namesFor(child.id).size })),
          effective
            ? h('span', { className: 'ah-badge' }, t('groups.effectiveBadge'))
            : cycle ? h('span', { className: 'ah-badge' }, t('groups.cycleHint')) : null);
        })));
      const inheritedActions = active === null
        ? []
        : actions.filter((action) => inheritedNames.has(action.name));
      const inheritedBlock = inheritedActions.length === 0 ? null : h('div', { className: 'ah-group-inherited' },
        h('div', { className: 'ah-group-section-label' }, t('groups.inheritedTitle')),
        h('div', { className: 'ah-group-inherited-list' }, inheritedActions.map((action) => h('span', { key: action.id, className: 'ah-badge' }, action.name))));
      const detailHeader = active === null ? null : h('header', { className: 'ah-group-detail-head' },
        h('div', null,
          h('h3', { className: 'ah-group-detail-title' }, active.name),
          h('span', { className: 'ah-count' }, t('groups.actionCount', { count: activeEffective.size }))),
        h('div', { className: 'ah-group-detail-actions' },
          h(Button, { ghost: true, small: true, onClick: () => setFiltered(true) }, t('groups.selectAll')),
          h(Button, { ghost: true, small: true, onClick: () => setFiltered(false) }, t('groups.clear'))));
      const detailTools = active === null ? null : h('div', { className: 'ah-group-tools' },
        h(SearchField, { value: query, placeholder: t('groups.actionSearch'), onChange: setQuery }),
        h('div', { className: 'ah-group-filters' },
          [['all', t('groups.filterAll')], ['selected', t('groups.filterSelected')], ['unselected', t('groups.filterUnselected')]].map(([value, label]) => h('button', {
            key: value,
            type: 'button',
            className: 'ah-chip',
            'data-active': filter === value,
            onClick: () => setFilter(value),
          }, label))));
      const actionRows = active === null ? null : h('div', { className: 'ah-group-actions' },
        filtered.length === 0
          ? h('div', { className: 'ah-group-empty' }, t('groups.noMatch'))
          : filtered.map((action) => {
            const inheritedOnly = inheritedNames.has(action.name) && !activeDirectSet.has(action.name);
            const state = activeDirectSet.has(action.name) ? 'on' : inheritedOnly ? 'inherited' : 'off';
            const directGroups = (action.groups ?? []).map(groupLabel).filter((name) => name !== '').join('、');
            return h('label', {
              key: action.id,
              className: 'ah-group-action',
              'data-checked': activeDirectSet.has(action.name),
              'data-state': state,
              title: inheritedOnly ? t('groups.inheritedFrom', { groups: directGroups }) : undefined,
            },
            h(ActionCheck, {
              checked: activeDirectSet.has(action.name),
              state,
              disabled: busy,
              onChange: () => toggle(action),
            }),
            h('span', { className: 'ah-group-action-main' },
              h('span', { className: 'ah-group-action-name' }, action.name),
              h('span', { className: 'ah-group-action-desc' }, action.description || '')),
            h('span', { className: 'ah-badge' }, action.mode === 'skill' ? t('lib.skill') : t('lib.command')));
          }));
      const detail = active === null
        ? h('div', { className: 'ah-group-empty' }, t('groups.empty'))
        : h(React.Fragment, null, detailHeader, includesBlock, detailTools, actionRows, inheritedBlock);
      const layout = h('div', { className: 'ah-group-layout' },
        h('aside', { className: 'ah-group-list', 'aria-label': t('groups.title') }, groupRows),
        h('section', { className: 'ah-group-detail' }, detail));
      const menuGroup = menu === null ? null : groups.find((group) => group.id === menu.id) ?? null;
      const contextMenu = menuGroup === null ? null : h('div', {
        className: 'ah-group-context',
        style: { left: `${menu.x}px`, top: `${menu.y}px` },
        onMouseDown: (event) => event.stopPropagation(),
      },
      h('button', {
        type: 'button',
        className: 'ah-group-context-item',
        onClick: () => { setMenu(null); startRename(menuGroup); },
      }, t('groups.rename')),
      h('button', {
        type: 'button',
        className: 'ah-group-context-item',
        'data-danger': 'true',
        onClick: () => { setMenu(null); void removeGroup(menuGroup); },
      }, t('groups.delete')));

      const footer = h(React.Fragment, null,
        h('span', { className: 'ah-group-dirty' }, dirtyCount > 0 ? t('groups.unsaved', { count: dirtyCount }) : t('groups.noChanges')),
        h(Button, { onClick: close }, t('action.cancel')),
        h(Button, { primary: true, disabled: busy || dirtyCount === 0, onClick: save }, t('groups.save')));
      const createRow = h('div', { className: 'ah-group-create' },
        h('input', {
          className: 'ah-input',
          value: name,
          placeholder: t('groups.namePlaceholder'),
          onChange: (event) => setName(event.target.value),
          onKeyDown: (event) => {
            if (event.key !== 'Enter' || name.trim() === '' || busy) return;
            event.preventDefault();
            void createGroup();
          },
        }),
        h(Button, { primary: true, disabled: busy || name.trim() === '', onClick: () => void createGroup() }, t('groups.create')));
      const errorView = error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error);

      if (props.embedded) {
        return h(React.Fragment, null,
          h('div', { className: 'ah-config-body' }, createRow, layout, contextMenu, errorView),
          h('div', { className: 'ah-modal-foot ah-config-foot' }, footer));
      }
      return h(Modal, {
        title: t('groups.title'),
        t,
        wide: true,
        onClose: close,
        footer,
      },
      createRow,
      layout,
      contextMenu,
      errorView);
    }

    function ProjectScopeDialog(props) {
      const { t } = props;
      const projects = Array.isArray(props.projects) ? props.projects : [];
      const scopes = Array.isArray(props.projectScopes) ? props.projectScopes : [];
      const groups = Array.isArray(props.groups) ? props.groups : [];
      const actions = Array.isArray(props.actions) ? props.actions : [];
      const currentProject = props.currentProject ?? null;
      const initialPath = currentProject?.path ?? scopes[0]?.path ?? projects[0]?.path ?? '';
      const [projectPath, setProjectPath] = React.useState(initialPath);
      const [drafts, setDrafts] = React.useState({});
      const [query, setQuery] = React.useState('');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);

      const keyOf = (value) => String(value ?? '').toLowerCase();
      const normalizeProfile = (raw, path) => ({
        path,
        label: typeof raw?.label === 'string' ? raw.label : '',
        groups: Array.isArray(raw?.groups) ? raw.groups : ['common'],
        actions: Array.isArray(raw?.actions) ? raw.actions : [],
      });
      const originalFor = (path) => {
        const found = scopes.find((entry) => keyOf(entry.path) === keyOf(path));
        return normalizeProfile(found ?? { path, label: '', groups: ['common'], actions: [] }, path);
      };
      const draftFor = (path) => drafts[keyOf(path)] ?? originalFor(path);
      const profile = draftFor(projectPath);
      const updateProfile = (updater) => {
        if (projectPath === '') return;
        const key = keyOf(projectPath);
        setDrafts((previous) => ({
          ...previous,
          [key]: updater(previous[key] ?? originalFor(projectPath)),
        }));
      };
      const maybeStaleProjects = (() => {
        const options = projects.map((project) => ({ ...project, stale: false }));
        for (const scope of scopes) {
          if (!options.some((project) => keyOf(project.path) === keyOf(scope.path))) {
            options.push({ label: scope.label || scope.path, path: scope.path, stale: true });
          }
        }
        return options;
      })();
      const differs = (before, after) => before.length !== after.length || before.some((entry) => !after.includes(entry));
      const dirtyProjects = maybeStaleProjects.filter((project) => {
        const before = originalFor(project.path);
        const after = draftFor(project.path);
        return differs(before.groups, after.groups) || differs(before.actions, after.actions);
      });
      const dirtyCount = dirtyProjects.reduce((sum, project) => {
        const before = originalFor(project.path);
        const after = draftFor(project.path);
        const groupsAdded = after.groups.filter((entry) => !before.groups.includes(entry)).length;
        const groupsRemoved = before.groups.filter((entry) => !after.groups.includes(entry)).length;
        const actionsAdded = after.actions.filter((entry) => !before.actions.includes(entry)).length;
        const actionsRemoved = before.actions.filter((entry) => !after.actions.includes(entry)).length;
        return sum + groupsAdded + groupsRemoved + actionsAdded + actionsRemoved;
      }, 0);
      React.useEffect(() => {
        props.onDirtyChange?.(dirtyCount);
      }, [dirtyCount, props.onDirtyChange]);
      const expandGroups = (selected) => {
        const byId = new Map(groups.map((group) => [group.id, group]));
        const seen = new Set();
        const visit = (id) => {
          if (typeof id !== 'string' || id === '' || seen.has(id)) return;
          seen.add(id);
          for (const child of byId.get(id)?.includes ?? []) visit(child);
        };
        for (const id of selected) visit(id);
        return seen;
      };
      const covered = (action) => {
        const selected = expandGroups(profile.groups);
        return (action.groups ?? []).some((id) => selected.has(id));
      };
      const collectGroupActions = (groupId, seen = new Set(), out = new Set()) => {
        if (typeof groupId !== 'string' || groupId === '' || seen.has(groupId)) return out;
        seen.add(groupId);
        for (const action of actions) if ((action.groups ?? []).includes(groupId)) out.add(action.name);
        const group = groups.find((entry) => entry.id === groupId);
        for (const child of group?.includes ?? []) collectGroupActions(child, seen, out);
        return out;
      };
      const groupActionCount = (groupId) => collectGroupActions(groupId).size;
      const selectedActionCount = actions.filter((action) => covered(action) || profile.actions.includes(action.name)).length;
      const filtered = query.trim() === ''
        ? actions
        : actions.filter((action) => `${action.name} ${action.description} ${(action.tags ?? []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));

      const selectProject = (path) => {
        setProjectPath(path);
        setQuery('');
      };
      const toggleGroup = (id, checked) => {
        updateProfile((previous) => ({
          ...previous,
          groups: checked ? [...new Set([...previous.groups, id])] : previous.groups.filter((entry) => entry !== id),
        }));
      };
      const toggleAction = (name, checked) => {
        updateProfile((previous) => ({
          ...previous,
          actions: checked ? [...new Set([...previous.actions, name])] : previous.actions.filter((entry) => entry !== name),
        }));
      };
      const close = () => {
        if (!props.embedded && dirtyCount > 0 && !window.confirm(t('groups.discard', { count: dirtyCount }))) return;
        props.onClose?.();
      };
      const save = async () => {
        setBusy(true);
        setError('');
        try {
          for (const project of dirtyProjects) {
            const draft = draftFor(project.path);
            await api('/project-scope', {
              path: project.path,
              label: project.label,
              groups: draft.groups,
              actions: draft.actions,
            });
          }
          await props.onChanged?.();
          if (!props.embedded) props.onClose?.();
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      const projectRows = maybeStaleProjects.map((project) => h('div', {
        key: project.path,
        className: 'ah-group-item',
        'data-active': keyOf(project.path) === keyOf(projectPath),
        onClick: () => selectProject(project.path),
      },
      h('div', { className: 'ah-group-item-main' },
        h('span', { className: 'ah-group-name' }, project.label || project.path),
        project.stale ? h('span', { className: 'ah-badge' }, t('editor.scopeStale')) : null),
      h('span', { className: 'ah-group-count' }, t('scope.groupCount', { count: draftFor(project.path).groups.length }))));

      const projectHead = h('header', { className: 'ah-group-detail-head' },
        h('div', { className: 'ah-scope-project-head' },
          h('h3', { className: 'ah-group-detail-title' }, profile.label || projectPath || t('scope.project')),
          h('span', { className: 'ah-scope-project-path', title: projectPath }, projectPath || t('scope.noProjects')),
          h('span', { className: 'ah-count' }, t('groups.actionCount', { count: selectedActionCount }))));

      const groupBlock = h('div', { className: 'ah-group-includes' },
        h('div', { className: 'ah-group-section-label' }, t('scope.groups')),
        h('p', { className: 'ah-hint' }, t('scope.groupsHint')),
        h('div', { className: 'ah-group-include-list' }, groups.map((group) => {
          const checked = profile.groups.includes(group.id);
          const effective = !checked && expandGroups(profile.groups).has(group.id);
          return h('label', {
            key: group.id,
            className: 'ah-group-include',
            'data-checked': checked,
            'data-effective': effective,
          },
          h('input', {
            type: 'checkbox',
            checked,
            disabled: busy,
            onChange: (event) => toggleGroup(group.id, event.target.checked),
          }),
          h('span', { className: 'ah-group-include-name' }, group.name),
          h('span', { className: 'ah-count' }, t('groups.actionCount', { count: groupActionCount(group.id) })),
          effective ? h('span', { className: 'ah-badge' }, t('groups.effectiveBadge')) : null);
        })));

      const actionTools = h('div', { className: 'ah-group-tools' },
        h('p', { className: 'ah-hint' }, t('scope.extraHint')),
        h(SearchField, { value: query, placeholder: t('scope.searchActions'), onChange: setQuery }));

      const actionRows = h('div', { className: 'ah-group-actions' },
        filtered.length === 0
          ? h('div', { className: 'ah-group-empty' }, t('groups.noMatch'))
          : filtered.map((action) => {
            const inherited = covered(action);
            const direct = profile.actions.includes(action.name);
            const state = direct ? 'on' : inherited ? 'inherited' : 'off';
            return h('label', {
              key: action.id,
              className: 'ah-group-action',
              'data-checked': direct,
              'data-covered': inherited,
              'data-state': state,
            },
            h(ActionCheck, {
              checked: direct,
              state,
              disabled: busy,
              onChange: (event) => toggleAction(action.name, event.target.checked),
            }),
            h('span', { className: 'ah-group-action-main' },
              h('span', { className: 'ah-group-action-name' }, action.name),
              h('span', { className: 'ah-group-action-desc' }, action.description || '')),
            h('span', { className: 'ah-badge' }, action.mode === 'skill' ? t('lib.skill') : t('lib.command')),
            inherited ? h('span', { className: 'ah-badge' }, t('scope.viaGroup')) : null);
          }));

      const detail = h(React.Fragment, null, projectHead, groupBlock, actionTools, actionRows);
      const layout = h('div', { className: 'ah-group-layout' },
        h('aside', { className: 'ah-group-list', 'aria-label': t('scope.projects') },
          h('div', { className: 'ah-group-section-label' }, t('scope.projects')),
          projectRows.length === 0 ? h('div', { className: 'ah-group-empty' }, t('scope.noProjects')) : projectRows),
        h('section', { className: 'ah-group-detail' }, detail));

      const footer = h(React.Fragment, null,
        h('span', { className: 'ah-group-dirty' }, dirtyCount > 0 ? t('groups.unsaved', { count: dirtyCount }) : t('groups.noChanges')),
        h(Button, { onClick: close }, t('action.cancel')),
        h(Button, { primary: true, disabled: busy || projectPath === '' || dirtyCount === 0, onClick: save }, t('groups.save')));
      const errorView = error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error);

      if (props.embedded) {
        return h(React.Fragment, null,
          h('div', { className: 'ah-config-body' }, layout, errorView),
          h('div', { className: 'ah-modal-foot ah-config-foot' }, footer));
      }
      return h(Modal, {
        title: t('scope.title'),
        t,
        wide: true,
        onClose: close,
        footer,
      },
      layout,
      errorView);
    }

    function ConfigDialog(props) {
      const { t } = props;
      const [tab, setTab] = React.useState(props.initialTab === 'scope' ? 'scope' : 'groups');
      const [dirty, setDirty] = React.useState({ groups: 0, scope: 0 });
      const setDirtyFor = (key) => (count) => {
        setDirty((previous) => (previous[key] === count ? previous : { ...previous, [key]: count }));
      };
      const dirtyCount = dirty.groups + dirty.scope;
      const close = () => {
        if (dirtyCount > 0 && !window.confirm(t('groups.discard', { count: dirtyCount }))) return;
        props.onClose?.();
      };
      const tabButton = (id, label) => h('button', {
        type: 'button',
        role: 'tab',
        className: 'ah-config-tab',
        'aria-selected': tab === id,
        'data-active': tab === id,
        onClick: () => setTab(id),
      }, label);

      return h(Modal, {
        title: t('config.title'),
        t,
        wide: true,
        onClose: close,
        head: h('div', { className: 'ah-config-tabs', role: 'tablist' }, tabButton('groups', t('groups.title')), tabButton('scope', t('scope.title'))),
      },
      h('div', { className: 'ah-config-pane', hidden: tab !== 'groups' },
        h(GroupDialog, { ...props, embedded: true, onClose: close, onDirtyChange: setDirtyFor('groups') })),
      h('div', { className: 'ah-config-pane', hidden: tab !== 'scope' },
        h(ProjectScopeDialog, { ...props, embedded: true, onClose: close, onDirtyChange: setDirtyFor('scope') })));
    }

    // --------------------------------------------------------------- palette

    function createPaletteView(hub, palette, prefsRef, shortcutStore) {
      return function ActionPalette(props) {
        const t = translate(props);
        const state = usePalette(palette);
        const snapshot = useHub(hub);
        const prefs = usePrefs(prefsRef);
        const shortcutState = useShortcutStore(shortcutStore);
        const searchRef = React.useRef(null);
        const listRef = React.useRef(null);
        const insertRef = React.useRef(null);
        const [selectedId, setSelectedId] = React.useState(null);
        const [args, setArgs] = React.useState('');
        const [toast, setToast] = React.useState({ text: '', kind: 'ok' });

        const actions = snapshot.actions ?? [];
        const categories = React.useMemo(() => categoriesOf(actions), [actions]);
        const visible = React.useMemo(
          () => visibleActions(actions, { query: state.query, category: state.category }),
          [actions, state.category, state.query],
        );
        const selected = visible.find((action) => action.id === selectedId) ?? visible[0] ?? null;
        const currentProject = snapshot.currentProject ?? null;
        const groupNames = (selected?.groups ?? [])
          .map((id) => (snapshot.groups ?? []).find((group) => group.id === id)?.name)
          .filter((name) => typeof name === 'string' && name !== '');

        React.useEffect(() => {
          if (!state.open) return undefined;
          const composer = document.querySelector('[data-composer-card="true"] [contenteditable="true"]')
            ?? document.querySelector('[contenteditable="true"]');
          setSelectedId(null);
          setArgs('');
          setToast({ text: '', kind: 'ok' });
          void hub.refresh().catch(() => {});
          const timer = setTimeout(() => searchRef.current?.focus(), 20);
          return () => {
            clearTimeout(timer);
            if (composer === null || !composer.isConnected) return;
            const hint = insertRef.current;
            insertRef.current = null;
            // The palette search box owns focus while open. Returning it to the
            // composer after close lets the user keep typing after an insert.
            // When the close followed a chip insert, the caret belongs right
            // after that chip instead of at the end of the draft.
            setTimeout(() => {
              try {
                const selection = window.getSelection();
                const previous = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                composer.focus({ preventScroll: true });
                if (hint !== null && hint.cursor === 'keep') return;
                const place = (range) => {
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                };
                if (hint !== null) {
                  const chips = [...composer.querySelectorAll('[data-composer-chip="action"]')];
                  for (let index = chips.length - 1; index >= 0; index -= 1) {
                    if (!chips[index].textContent.includes(hint.label)) continue;
                    const range = document.createRange();
                    range.setStartAfter(chips[index]);
                    range.collapse(true);
                    place(range);
                    return;
                  }
                }
                if (previous !== null && composer.contains(previous.startContainer)) {
                  place(previous);
                  return;
                }
                const range = document.createRange();
                range.selectNodeContents(composer);
                range.collapse(false);
                place(range);
              } catch {
                /* focus restoration is best-effort */
              }
            }, 0);
          };
        }, [state.open]);

        React.useEffect(() => {
          if (selectedId === null && visible.length > 0) setSelectedId(visible[0].id);
          if (selectedId !== null && !visible.some((action) => action.id === selectedId)) setSelectedId(visible[0]?.id ?? null);
        }, [visible, selectedId]);

        React.useEffect(() => {
          if (!state.open || selected === null) return;
          const node = listRef.current?.querySelector(`[data-action-id="${selected.id}"]`);
          node?.scrollIntoView({ block: 'nearest' });
        }, [selected?.id, state.open]);

        const close = React.useCallback(() => palette.close(), [palette]);
        const cycleCategory = React.useCallback((direction) => {
          const names = ['', ...categories.map(([name]) => name)];
          const index = Math.max(0, names.indexOf(state.category));
          const next = names[(index + direction + names.length) % names.length];
          palette.update({ category: next });
        }, [categories, palette, state.category]);

        React.useEffect(() => {
          if (!state.open) return undefined;
          const onKey = (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close();
              return;
            }
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            const target = event.target instanceof Element ? event.target : null;
            const editable = target?.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
            if (editable && target !== searchRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            cycleCategory(event.key === 'ArrowRight' ? 1 : -1);
          };
          document.addEventListener('keydown', onKey);
          return () => document.removeEventListener('keydown', onKey);
        }, [state.open, close, cycleCategory]);

        if (!state.open) return null;

        const bridge = state.bridge;
        const canWrite = Boolean(bridge?.inputActions);

        const showToast = (text, kind = 'ok') => {
          setToast({ text, kind });
          setTimeout(() => setToast((current) => (current.text === text ? { text: '', kind: 'ok' } : current)), 2600);
        };

        const doInsert = (action, mode) => {
          if (action.available === false) {
            showToast(t('palette.unavailable'), 'error');
            return;
          }
          if (!canWrite) {
            showToast(t('palette.insertFailed'), 'error');
            return;
          }
          const inputActions = bridge.inputActions;
          const draft = bridge.input?.draft ?? '';
          const occurrences = Array.isArray(bridge.input?.occurrences) ? bridge.input.occurrences : [];
          // A leading Action marker is still a normal reference draft; only a
          // real slash command (or a claimed input) blocks chip composition.
          const commandDraft = /^\/(?!ah-[0-9a-f]{10}(?![0-9a-f]))/u.test(draft.trimStart());
          const hasCommand = bridge.input?.claim !== undefined || commandDraft;
          const handle = snapshot.meta?.handles?.[action.id];
          const isSkill = action.mode === 'skill';
          const referenceMode = !isSkill && args.trim() === '' && typeof handle === 'string' && handle !== '';
          const referenceText = referenceMode ? `/${handle}` : '';
          const skillText = isSkill ? expandPrompt(action.prompt, { args }) : '';
          const text = referenceMode ? referenceText : isSkill ? skillText : expandPrompt(action.prompt, { args });
          let placed = false;
          let atCaret = false;
          let referenced = false;
          try {
            const span = typeof inputActions.captureInsertion === 'function' ? inputActions.captureInsertion() : null;
            if (referenceMode && !hasCommand && typeof inputActions.setDraft === 'function') {
              const composed = composeReferenceDraft({ draft, span, occurrences, marker: referenceText, label: action.name });
              if (composed !== null) {
                inputActions.setDraft(composed);
                placed = true;
                referenced = true;
              }
            }
            if (!placed && span && typeof inputActions.insertText === 'function') {
              const result = inputActions.insertText(isSkill ? skillText : referenceMode ? `${referenceText} ` : text, span);
              placed = result !== false;
              atCaret = placed;
              referenced = placed && referenceMode;
            }
          } catch {
            placed = false;
          }
          if (!placed) {
            try {
              inputActions.setDraft(composeDraft(draft, isSkill ? skillText : referenceMode ? `${referenceText} ` : text));
              placed = true;
              referenced = referenceMode;
            } catch {
              placed = false;
            }
          }
          if (!placed) {
            showToast(t('palette.insertFailed'), 'error');
            return;
          }
          inputActions.persistDraft?.();
          void hub.call('/touch', { id: action.id }).catch(() => {});
          if (mode === 'send') {
            setTimeout(() => {
              try {
                inputActions.submit?.();
                showToast(t('palette.sent'));
              } catch {
                showToast(t('palette.sendFailed'), 'error');
              }
            }, 40);
            return;
          }
          if (referenced) showToast(t('palette.refInserted'));
          else showToast(atCaret ? t('palette.insertedAtCaret') : t('palette.inserted'));
          if (prefs.closeAfterInsert) {
            insertRef.current = isSkill ? { cursor: 'keep' } : referenced ? { label: action.name } : null;
            setTimeout(() => palette.close(), 220);
          }
        };

        const onSearchKey = (event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            const index = Math.max(0, visible.findIndex((action) => action.id === selected?.id));
            const next = visible[Math.min(index + 1, visible.length - 1)];
            if (next) setSelectedId(next.id);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const index = Math.max(0, visible.findIndex((action) => action.id === selected?.id));
            const next = visible[Math.max(index - 1, 0)];
            if (next) setSelectedId(next.id);
          } else if (event.key === 'Enter') {
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              if (selected) doInsert(selected, 'send');
            } else {
              event.preventDefault();
              if (selected) doInsert(selected, 'insert');
            }
          } else if (event.key === 'Tab' && !event.shiftKey) {
            // Match the `/` reference menu: Tab completes the selected Action.
            // Shift+Tab falls through to normal focus navigation.
            event.preventDefault();
            if (selected) doInsert(selected, 'insert');
          }
        };

        const header = h('div', { className: 'ah-palette-search' },
          h(SearchField, { inputRef: searchRef, value: state.query, placeholder: t('palette.search'), onChange: (value) => palette.update({ query: value }), onKeyDown: onSearchKey }),
          h(Kbd, null, 'Esc'));

        const catRow = h('div', { className: 'ah-palette-cats' },
          h('button', { type: 'button', className: 'ah-chip', 'data-active': state.category === '', onClick: () => palette.update({ category: '' }) }, t('lib.all')),
          categories.map(([name, count]) => h('button', {
            key: name,
            type: 'button',
            className: 'ah-chip',
            'data-active': state.category === name,
            onClick: () => palette.update({ category: state.category === name ? '' : name }),
          }, name, h('span', { className: 'ah-chip-count' }, count))));

        const results = h('div', { className: 'ah-results', ref: listRef, role: 'listbox', 'aria-label': t('palette.title') },
          visible.length === 0
            ? h('div', { className: 'ah-preview-empty' }, h(Icons.shelf, { size: 24 }), actions.length === 0 ? t('palette.empty') : t('palette.noMatch'))
            : visible.map((action) => h('button', {
              key: action.id,
              type: 'button',
              role: 'option',
              className: 'ah-result',
              'data-action-id': action.id,
              'data-active': action.id === selected?.id,
              'data-unavailable': action.available === false,
              'aria-selected': action.id === selected?.id,
              'aria-disabled': action.available === false,
              onMouseEnter: () => setSelectedId(action.id),
              onClick: () => doInsert(action, 'insert'),
            },
            h('div', { className: 'ah-result-main' },
              h('div', { className: 'ah-result-title' },
                action.pinned ? h('span', { className: 'ah-result-star' }, h(Icons.star, { size: 11, filled: true })) : null,
                h('span', { className: 'ah-result-name' }, action.name),
                action.category ? h('span', { className: 'ah-badge ah-badge-accent' }, action.category) : null,
                action.available === false ? h('span', { className: 'ah-badge' }, t('palette.scopeUnavailable')) : null),
              h('span', { className: 'ah-result-desc' }, action.description || (action.argsHint ? `${action.argsHint}` : action.prompt.slice(0, 80)))))));

        const preview = selected === null
          ? h('div', { className: 'ah-preview' },
            h('div', { className: 'ah-preview-empty' },
              h('div', { className: 'ah-empty-title' }, actions.length === 0 ? t('palette.empty') : t('palette.noMatch')),
              h('div', { className: 'ah-empty-copy' }, actions.length === 0 ? t('palette.emptyCopy') : ''),
              actions.length === 0
                ? h('div', { className: 'ah-empty-actions' },
                  h(Button, { onClick: () => { palette.close(); props.ctx.get('layout')?.selectPanel?.(PANEL_ID); } }, t('palette.manage')))
                : null))
          : h('div', { className: 'ah-preview' },
            h('div', { className: 'ah-preview-head' },
              h('h2', { className: 'ah-preview-title' }, selected.name),
              h(Button, { ghost: true, iconOnly: true, small: true, title: selected.pinned ? t('action.unpin') : t('action.pin'), onClick: async () => {
                try {
                  await hub.patchAction(selected.id, { pinned: selected.pinned !== true });
                  showToast(selected.pinned ? t('lib.unpinned') : t('lib.pinned'));
                } catch (failure) {
                  showToast(describeError(failure), 'error');
                }
              } }, h(Icons.star, { size: 14, filled: selected.pinned === true }))),
            h('div', { className: 'ah-preview-meta' },
              selected.category ? h('span', { className: 'ah-badge ah-badge-accent' }, selected.category) : h('span', { className: 'ah-badge' }, t('lib.uncategorized')),
              selected.mode === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : h('span', { className: 'ah-badge' }, t('lib.command')),
              (selected.tags ?? []).map((tag) => h('span', { key: tag, className: 'ah-badge' }, `#${tag}`)),
              (selected.resources ?? []).length > 0 ? h('span', { className: 'ah-badge' }, t('palette.resourceCount', { count: selected.resources.length })) : null,
              selected.usage?.count > 0 ? h('span', { className: 'ah-count' }, t('palette.usage', { count: selected.usage.count })) : null),
            selected.description ? h('p', { className: 'ah-preview-desc' }, selected.description) : null,
            selected.available === false ? h('p', { className: 'ah-hint ah-hint-warn' }, t('palette.unavailableHint')) : null,
            h('p', { className: 'ah-hint' }, `${t('editor.groups')}: ${groupNames.length === 0 ? t('palette.noGroups') : groupNames.join('、')}`),
            selected.argsHint ? h('p', { className: 'ah-hint' }, `${t('editor.args')}: ${selected.argsHint}`) : null,
            selected !== null && selected.mode === 'skill'
              ? h('p', { className: 'ah-hint' }, t('palette.skillHint', { name: selected.name }))
              : null,
            selected !== null && selected.mode !== 'skill' && snapshot.meta?.referencing && typeof snapshot.meta?.handles?.[selected.id] === 'string'
              ? h('p', { className: 'ah-hint' }, args.trim() === ''
                ? t('palette.refHint', { name: selected.name })
                : t('palette.refArgsHint'))
              : null,
            h('pre', { className: 'ah-code ah-preview-body' }, selected.prompt));

        const footer = h('div', { className: 'ah-palette-foot' },
          h('div', { className: 'ah-foot-row' },
            h('div', { className: 'ah-args' },
              h('input', {
                className: 'ah-input',
                value: args,
                placeholder: t('palette.args'),
                'aria-label': t('palette.args'),
                onChange: (event) => setArgs(event.target.value),
              })),
            h('div', { className: 'ah-actions' },
              h(Button, { ghost: true, small: true, onClick: () => { palette.close(); props.ctx.get('layout')?.selectPanel?.(PANEL_ID); } }, t('action.scopes')),
              h(Button, { ghost: true, small: true, onClick: () => { palette.close(); props.ctx.get('layout')?.selectPanel?.(PANEL_ID); } }, t('palette.manage')),
              h(Button, { small: true, primary: true, onClick: () => { if (selected) doInsert(selected, 'insert'); }, disabled: !canWrite || selected === null || selected.available === false }, h(Icons.arrow, { size: 13 }), t('palette.insert')),
              h(Button, { small: true, onClick: () => { if (selected) doInsert(selected, 'send'); }, disabled: !canWrite || selected === null || selected.available === false }, h(Icons.send, { size: 13 }), t('palette.send')))),
          h('div', { className: 'ah-hints' },
            h('span', null, currentProject === null ? t('palette.noCurrentProject') : t('palette.currentProject', { name: currentProject.label })),
            h('span', null, h(Kbd, null, '←→'), ` ${t('palette.hintTab')}`),
            h('span', null, h(Kbd, null, '↑↓'), ` ${t('palette.hintNav')}`),
            h('span', null, h(Kbd, null, 'Tab'), ' / ', h(Kbd, null, '↵'), ` ${t('palette.hintInsert')}`),
            h('span', null, h(Kbd, null, 'Ctrl+↵'), ` ${t('palette.hintSend')}`),
            h('span', null, h(Kbd, null, shortcutState.manageKeys.join('')), ` ${t('palette.manage')}`)));

        const toastView = toast.text === '' ? null : h('div', { className: 'ah-toast', 'data-kind': toast.kind, role: 'status' }, toast.text);

        const bodyContent = h(React.Fragment, null,
          h('div', { className: 'ah-palette-body' }, results, preview));

        return h('div', {
          className: 'ah-backdrop',
          'data-palette': 'true',
          onMouseDown: (event) => { if (event.target === event.currentTarget) close(); },
        },
        h('div', {
          className: 'ah-palette',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t('palette.title'),
          onMouseDown: (event) => event.stopPropagation(),
        },
        header,
        catRow,
        bodyContent,
        toastView,
        footer));
      };
    }

    function usePalette(palette) {
      const [snapshot, setSnapshot] = React.useState(() => palette.get());
      React.useEffect(() => palette.subscribe(setSnapshot), [palette]);
      return snapshot;
    }

    // Session bridge: hands the frame-level palette the live composer facade.
    function createSessionBridge(palette) {
      return function SessionBridge(props) {
        const input = typeof props.useInput === 'function' ? props.useInput((state) => state) : undefined;
        const sessionId = props.sessionId;
        const actions = props.inputActions;

        React.useEffect(() => {
          if (sessionId === undefined || actions === undefined) return undefined;
          palette.setBridge({ sessionId, inputActions: actions, input });
          return () => palette.clearBridge(sessionId);
        }, [sessionId, actions, input?.draftRev, input?.phase, input?.draft]);

        return null;
      };
    }

    function createTrigger(palette) {
      return function ActionTrigger(props) {
        const t = translate(props);
        const prefs = usePrefs(props.prefs);
        const shortcut = useShortcutStore(props.shortcuts);
        const state = usePalette(palette);
        if (!prefs.showTrigger) return null;
        const keys = shortcut.keys.length > 0 ? shortcut.keys.join('') : (MAC ? '⌥A' : 'Alt+A');
        return h('button', {
          type: 'button',
          className: 'ah-trigger',
          'data-open': state.open,
          title: t('trigger.tooltip', { keys }),
          'aria-label': t('trigger.tooltip', { keys }),
          onClick: () => (state.open ? palette.close() : palette.open()),
        }, h(Icons.shelf, { size: 16 }));
      };
    }

    // ----------------------------------------------------------------- settings

    function createSettings(hub, prefs) {
      return function ActionHubSettings(props) {
        const t = translate(props);
        const snapshot = useHub(hub);
        const state = usePrefs(prefs);
        const shortcuts = useShortcutStore(props.shortcuts);
        const [notice, setNotice] = React.useState('');
        const saved = (text) => {
          setNotice(text);
          setTimeout(() => setNotice(''), 2000);
        };

        return h('div', { className: 'ah-settings' },
          h('div', null,
            h('h2', { className: 'ah-modal-title', style: { margin: '0 0 6px' } }, t('settings.title')),
            h('p', { className: 'ah-sub', style: { margin: 0 } }, t('settings.desc'))),
          notice === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'ok', role: 'status' }, notice),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.behavior')),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.closeAfterInsert')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.closeAfterInsertDesc'))),
              h(Switch, { checked: state.closeAfterInsert, label: t('settings.closeAfterInsert'), onChange: (value) => { prefs.set({ closeAfterInsert: value }); saved(t('settings.saved')); } })),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.trigger')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.triggerDesc'))),
              h(Switch, { checked: state.showTrigger, label: t('settings.trigger'), onChange: (value) => { prefs.set({ showTrigger: value }); saved(t('settings.saved')); } })),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.sidebarEntry')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.sidebarEntryDesc'))),
              h(Switch, { checked: state.showSidebarEntry, label: t('settings.sidebarEntry'), onChange: (value) => { prefs.set({ showSidebarEntry: value }); saved(t('settings.saved')); } }))),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.shortcutsTitle')),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.hotkey')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.hotkeyDesc')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.hotkeyManage'))),
              h('span', { className: 'ah-kbd' }, shortcuts.keys.length > 0 ? shortcuts.keys.join('') : (MAC ? '⌥A' : 'Alt+A'))),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.manageHotkey')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.manageHotkeyDesc')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.manageHotkeyManage'))),
              h('span', { className: 'ah-kbd' }, shortcuts.manageKeys.length > 0 ? shortcuts.manageKeys.join('') : (MAC ? '⌘⌥A' : 'Ctrl+Alt+A'))),
            h('span', { className: 'ah-hint', style: { marginTop: '-2px' } }, t('settings.shortcutGroupHint'))),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.data')),
            h('p', { className: 'ah-settings-row-desc' }, t('settings.dataDesc', { path: snapshot.meta.dataFileDisplay ?? snapshot.meta.dataFile ?? '—', count: snapshot.actions.filter((action) => action.builtin !== true).length })),
            h('div', { className: 'ah-actions' },
              h(Button, { onClick: () => props.ctx.get('layout')?.selectPanel?.(PANEL_ID) }, t('settings.openLibrary')),
              h(Button, { onClick: async () => {
                try {
                  await downloadZip();
                  saved(t('lib.exported'));
                } catch (failure) {
                  saved(describeError(failure));
                }
              } }, t('settings.export')))),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.about')),
            h('p', { className: 'ah-settings-row-desc' }, t('settings.aboutDesc', { version: VERSION }))));
      };
    }

    // ----------------------------------------------------------------- plugin

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: TEXT.zh, en: TEXT.en }), 'action-hub: dictionaries');
      ctx.effect(() => {
        const style = document.createElement('style');
        style.setAttribute('data-dsh-action-hub', '');
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => style.remove();
      }, 'action-hub: styles');

      const t = ctx.locale.bind(NS);
      const hub = createHub();
      const prefs = createPrefs();
      const palette = createPalette();
      const shortcuts = createShortcutStore(ctx, palette, t);
      const previousPalette = typeof window !== 'undefined' ? window.__dshActionHubPalette : undefined;
      if (typeof window !== 'undefined') window.__dshActionHubPalette = palette;

      setChipNames(hub.get());
      ctx.effect(() => hub.subscribe(setChipNames), 'action-hub: reference names');
      installActionChipRule(ctx);
      ctx.effect(() => {
        installActionReferenceSource(ctx);
        return () => {
          referenceSourceOff?.();
          referenceSourceOff = null;
        };
      }, 'action-hub: reference source');

      ctx.effect(() => () => {
        hub.dispose();
        shortcuts.dispose();
        palette.close();
        if (typeof window !== 'undefined' && window.__dshActionHubPalette === palette) {
          window.__dshActionHubPalette = previousPalette;
        }
      }, 'action-hub: stores');

      const Page = createPage(hub, ctx);
      const PaletteView = createPaletteView(hub, palette, prefs, shortcuts);
      const SessionBridge = createSessionBridge(palette);
      const Trigger = createTrigger(palette);
      const Settings = createSettings(hub, prefs);

      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, Page));

      ctx.slots.inject('sidebar.panellist', () => {
        let dispose = null;
        const sync = () => {
          dispose?.();
          dispose = null;
          if (prefs.get().showSidebarEntry === false) return;
          dispose = ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 32,
            label: () => t('app.name'),
            locale: NS,
          }, PanelIcon);
        };
        const off = prefs.subscribe(sync);
        sync();
        return () => {
          off();
          dispose?.();
        };
      });

      ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
        name: 'conversation.input.left',
        id: 'action-hub',
        order: 30,
        label: () => t('trigger.label'),
        locale: NS,
      }, (props) => h(Trigger, { ...props, prefs, shortcuts })));

      ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
        name: 'conversation.input.overlay',
        id: 'action-hub-bridge',
        order: 90,
        locale: NS,
      }, SessionBridge));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'action-hub-palette',
        order: 80,
        locale: NS,
      }, (props) => h(PaletteView, { ...props, ctx })));

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: PANEL_ID,
        order: 25,
        label: () => t('settings.nav'),
        locale: NS,
      }, (props) => h(Settings, { ...props, ctx, shortcuts })));

      ctx.slots.inject('conversation.user.text.node', () => ctx.slots.register({
        name: 'conversation.user.text.node',
        key: 'action-hub',
        priority: 120,
        locale: NS,
      }, ActionUserChip));
    }

    function PanelIcon(props) {
      const size = typeof props?.size === 'number' && props.size > 0 ? props.size : 16;
      return h('svg', {
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: 'false',
        style: { display: 'block' },
      },
      h('rect', { x: 2.4, y: 2.6, width: 11.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
      h('rect', { x: 2.4, y: 6.5, width: 11.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
      h('rect', { x: 2.4, y: 10.4, width: 7.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }));
    }

    return {
      name: PKG,
      inject: ['slots', 'locale'],
      apply,
      internals: {
        expandPrompt,
        composeDraft,
        composeReferenceDraft,
        matchActionMarker,
        searchScore,
        sortActions,
        categoriesOf,
        visibleActions,
        relativeTime,
        TEXT,
      },
    };
  },
});
