/**
 * dsh-action-hub — Client half (Web UI).
 *
 * Product surfaces:
 *   - `conversation.input.left`: a compact "Actions" trigger in the composer tool row.
 *   - `conversation.input.overlay`: a session bridge that hands the palette the
 *     live composer facade (inputActions / input state) it needs to insert text.
 *   - `shell.overlay`: the Spotlight-style palette (Ctrl/⌘+Shift+.), rendered at
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
    const VERSION = '1.1.0';
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
      .ah-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .ah-search { position: relative; flex: 1 1 260px; min-width: 200px; }
      .ah-search input { width: 100%; box-sizing: border-box; height: 34px; padding: 0 12px 0 32px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; outline: none; }
      .ah-search input:focus { border-color: var(--dsw-alias-brand-primary); }
      .ah-search-mark { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); display: flex; color: var(--dsw-alias-label-secondary); pointer-events: none; }
      .ah-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
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
      .ah-kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 5px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 10.5px; font-family: inherit; line-height: 1; }
      /* modal */
      .ah-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(9, 11, 16, .42); display: flex; align-items: center; justify-content: center; padding: 24px; }
      .ah-backdrop[data-palette="true"] { align-items: flex-start; padding-top: max(10vh, 48px); backdrop-filter: blur(4px); }
      .ah-modal { width: min(680px, 100%); max-height: min(86vh, 880px); display: flex; flex-direction: column; background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; box-shadow: 0 26px 70px rgba(0, 0, 0, .46); overflow: hidden; outline: none; }
      .ah-modal-head { display: flex; align-items: center; gap: 12px; padding: 16px 20px 13px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .ah-modal-title { margin: 0; font-size: 15px; font-weight: 650; flex: 1 1 auto; }
      .ah-modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
      .ah-modal-foot { padding: 12px 20px 16px; border-top: 1px solid var(--dsw-alias-border-l1); display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
      .ah-field { display: flex; flex-direction: column; gap: 6px; }
      .ah-label { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
      .ah-hint { font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
      .ah-field-row { display: flex; gap: 14px; flex-wrap: wrap; }
      .ah-field-row > .ah-field { flex: 1 1 200px; min-width: 150px; }
      .ah-input, .ah-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; padding: 9px 11px; outline: none; }
      .ah-input:focus, .ah-textarea:focus { border-color: var(--dsw-alias-brand-primary); }
      .ah-textarea { resize: vertical; min-height: 160px; font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; font-size: 12.5px; line-height: 1.65; }
      .ah-code { margin: 0; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; font-size: 12px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; max-height: 280px; overflow: auto; }
      .ah-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .ah-tab { appearance: none; background: transparent; border: 0; border-bottom: 2px solid transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12.5px; height: 34px; padding: 0 10px; cursor: pointer; }
      .ah-tab[data-active="true"] { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-brand-primary); }
      .ah-list-plain { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
      .ah-plain-item { border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; padding: 9px 11px; display: flex; align-items: center; gap: 10px; }
      .ah-plain-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .ah-plain-name { font-size: 12.5px; font-weight: 600; }
      .ah-plain-desc { font-size: 11.5px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ah-radio-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
      .ah-radio-row label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
      .ah-hidden { display: none !important; }
      .ah-user-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 260px; padding: 0 6px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); color: color-mix(in srgb, var(--dsw-alias-brand-primary) 82%, var(--dsw-alias-label-primary)); font-weight: 500; user-select: none; }
      .ah-user-chip-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      /* palette */
      .ah-palette { width: min(820px, 100%); max-height: min(68vh, 620px); display: flex; flex-direction: column; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); border-radius: 15px; box-shadow: 0 30px 80px rgba(0, 0, 0, .5); overflow: hidden; }
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
      .ah-palette-foot { border-top: 1px solid var(--dsw-alias-border-l1); padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .ah-args { flex: 1 1 220px; display: flex; align-items: center; gap: 8px; min-width: 160px; }
      .ah-args .ah-input { height: 30px; font-size: 12px; padding: 0 10px; }
      .ah-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .ah-hints { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--dsw-alias-label-secondary); flex-wrap: wrap; }
      .ah-toast { margin: 0 14px; padding: 7px 11px; border-radius: 8px; font-size: 12px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); }
      .ah-toast[data-kind="ok"] { color: var(--dsw-alias-state-success-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, transparent); }
      .ah-toast[data-kind="error"] { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 50%, transparent); }
      .ah-capture { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
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
        'app.subtitle': '把常用的提示词和流程存成 Action。它们不占上下文、不会被 Agent 自动调用，只在需要时由你从面板里取用。',
        'app.name': 'Actions',
        'action.new': '新建 Action',
        'action.import': '导入',
        'action.export': '导出',
        'action.refresh': '刷新',
        'action.save': '保存',
        'action.cancel': '取消',
        'action.delete': '删除',
        'action.deleteForever': '确认删除',
        'action.edit': '编辑',
        'action.duplicate': '复制一份',
        'action.copy': '复制正文',
        'action.pin': '置顶',
        'action.unpin': '取消置顶',
        'action.open': '查看',
        'action.close': '关闭',
        'lib.all': '全部',
        'lib.uncategorized': '未分类',
        'lib.categories': '分类',
        'lib.manageCategories': '管理分类',
        'lib.search': '搜索名称、描述、分类、标签或正文…',
        'lib.count': '{count} 个 Action',
        'lib.countFiltered': '{count} / {total}',
        'lib.sortRecent': '最近使用',
        'lib.sortName': '名称',
        'lib.sortCreated': '最近创建',
        'lib.sortLabel': '排序',
        'lib.emptyTitle': '收藏夹还是空的',
        'lib.emptyCopy': '把经常重复输入的提示词存成 Action：从右侧新建，或让面板把当前草稿收进来。',
        'lib.emptyFiltered': '没有匹配的 Action。换个关键词或分类试试。',
        'lib.emptyCta': '新建第一个 Action',
        'lib.loading': '读取中…',
        'lib.loadFailed': '读取 Actions 失败：{error}',
        'lib.retry': '重试',
        'lib.copied': '正文已复制',
        'lib.copyFailed': '复制失败，请手动选择正文',
        'lib.saved': '已保存',
        'lib.deleted': '已删除',
        'lib.duplicated': '已创建副本',
        'lib.pinned': '已置顶',
        'lib.unpinned': '已取消置顶',
        'lib.updated': '更新于 {time}',
        'lib.used': '用过 {count} 次',
        'lib.skill': 'Skill',
        'lib.detailTitle': 'Action 详情',
        'lib.detailMeta': '分类 {category}',
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
        'editor.prompt': '提示词正文',
        'editor.promptPlaceholder': '把要发给 Agent 的提示词写在这里…',
        'editor.promptHint': '支持多段 Markdown；{{args}} 是参数，{{date}} 是当天日期。',
        'editor.pinned': '置顶',
        'editor.required': '请填写名称与正文。',
        'delete.title': '删除这个 Action？',
        'delete.copy': '「{name}」会从收藏夹永久移除。',
        'import.title': '导入 Actions',
        'import.jsonTab': '粘贴 JSON',
        'import.skillTab': '从 Skill 导入',
        'import.jsonHint': '粘贴本插件导出的 JSON，或选择文件。',
        'import.chooseFile': '选择文件…',
        'import.mode': '导入方式',
        'import.merge': '合并（同 id 覆盖）',
        'import.replace': '替换全部',
        'import.run': '开始导入',
        'import.invalid': '无法解析这份 JSON',
        'import.done': '导入完成：新增 {added}，更新 {updated}',
        'import.skillCwd': '项目目录（可选）',
        'import.skillCwdHint': '留空扫描 Profile 默认目录；项目级 Skill 需要填写项目根目录。',
        'import.skillLoad': '读取 Skills',
        'import.skillEmpty': '没有找到 Skill，检查目录是否正确。',
        'import.skillImport': '导入为 Action',
        'import.skillDone': '已导入：{name}',
        'import.skillUnavailable': '当前 Profile 未启用 Skills 服务',
        'category.title': '分类管理',
        'category.empty': '还没有分类',
        'category.rename': '重命名',
        'category.delete': '删除分类',
        'category.deleteHint': '分类里的 Action 会移到未分类。',
        'category.deleteConfirm': '删除分类「{name}」？',
        'category.deleteConfirmDesc': '该分类下还有 {count} 个 Action。删除分类后它们会移到未分类，Action 本身不会被删除。',
        'category.deleteConfirmEmpty': '该分类下没有 Action，可以安全删除。',
        'category.confirmDelete': '确认删除',
        'category.name': '新名称',
        'category.count': '{count} 个',
        'palette.title': '选择一个 Action',
        'palette.search': '搜索 Action…',
        'palette.empty': '还没有 Action',
        'palette.emptyCopy': '新建一条，或把当前草稿存成 Action，之后在这里一搜即用。',
        'palette.noMatch': '没有匹配的 Action',
        'palette.args': '参数（可选，替换 {{args}}）',
        'palette.insert': '插入',
        'palette.send': '发送',
        'palette.capture': '存当前草稿',
        'palette.manage': '管理',
        'palette.inserted': '已插入输入框',
        'palette.insertedAtCaret': '已插入到光标处',
        'palette.sent': '已插入并发送',
        'palette.insertFailed': '当前会话暂时无法写入输入框',
        'palette.sendFailed': '发送失败，草稿已保留',
        'palette.busy': '正在发送，稍后再试',
        'palette.captureTitle': '把当前草稿存为 Action',
        'palette.captureEmpty': '草稿是空的，先写点内容再存。',
        'palette.capturePrompt': '正文',
        'palette.captureDone': '已存为 Action：{name}',
        'palette.hintNav': '选择',
        'palette.hintInsert': '插入',
        'palette.hintSend': '发送',
        'palette.hintClose': '关闭',
        'palette.hintTab': '切换分类',
        'palette.noSession': '先在对话中打开输入框，再使用 Actions。',
        'palette.skillsHint': '需要批量导入？在管理页「导入 → 从 Skill 导入」。',
        'palette.refHint': '将以引用方式插入：对话中只显示「{name}」',
        'palette.refArgsHint': '已填参数，将以完整文本插入',
        'palette.refInserted': '已插入引用',
        'palette.usage': '用过 {count} 次',
        'palette.pinned': '已置顶',
        'trigger.label': 'Actions',
        'trigger.tooltip': 'Actions 收藏夹（{keys}）',
        'shortcut.open': '打开 Actions 面板',
        'settings.nav': 'Action Hub',
        'settings.title': 'Action Hub',
        'settings.desc': '快捷面板、插入行为与数据位置。',
        'settings.behavior': '行为',
        'settings.closeAfterInsert': '插入后关闭面板',
        'settings.closeAfterInsertDesc': '关闭后可以直接按 Enter 发送；关闭此项则留在面板里连续插入。',
        'settings.hotkey': '全局快捷键',
        'settings.hotkeyDesc': '在任意会话里打开 Actions 面板。',
        'settings.hotkeyManage': '可在 设置 → 通用设置 → 快捷键 中查看或修改。',
        'settings.trigger': '在输入框工具行显示按钮',
        'settings.triggerDesc': '关闭后仍可用全局快捷键打开。',
        'settings.data': '数据',
        'settings.dataDesc': 'Actions 保存在本机（{path}），共 {count} 条。',
        'settings.openLibrary': '打开管理页',
        'settings.export': '导出全部',
        'settings.about': '关于',
        'settings.aboutDesc': 'Action Hub {version} · 不注册 Agent Tool、不注入上下文。',
        'settings.hotkeyKeys': 'Ctrl + Shift + A',
        'settings.saved': '设置已保存',
        'notice.savedLocally': '已保存在本机',
        'skill.source': '从 Skill 导入',
      },
      en: {
        'app.title': 'Action Hub',
        'app.subtitle': 'Keep reusable prompts and flows as Actions. They never enter context and are never triggered by the agent — you take one from the palette when you need it.',
        'app.name': 'Actions',
        'action.new': 'New Action',
        'action.import': 'Import',
        'action.export': 'Export',
        'action.refresh': 'Refresh',
        'action.save': 'Save',
        'action.cancel': 'Cancel',
        'action.delete': 'Delete',
        'action.deleteForever': 'Delete',
        'action.edit': 'Edit',
        'action.duplicate': 'Duplicate',
        'action.copy': 'Copy body',
        'action.pin': 'Pin',
        'action.unpin': 'Unpin',
        'action.open': 'Open',
        'action.close': 'Close',
        'lib.all': 'All',
        'lib.uncategorized': 'Uncategorized',
        'lib.categories': 'Categories',
        'lib.manageCategories': 'Manage categories',
        'lib.search': 'Search name, description, category, tag, or body…',
        'lib.count': '{count} Actions',
        'lib.countFiltered': '{count} / {total}',
        'lib.sortRecent': 'Recently used',
        'lib.sortName': 'Name',
        'lib.sortCreated': 'Recently created',
        'lib.sortLabel': 'Sort',
        'lib.emptyTitle': 'Your shelf is empty',
        'lib.emptyCopy': 'Save the prompts you keep retyping. Create one here, or capture the current draft from the palette.',
        'lib.emptyFiltered': 'No Action matches. Try another keyword or category.',
        'lib.emptyCta': 'Create your first Action',
        'lib.loading': 'Loading…',
        'lib.loadFailed': 'Could not load Actions: {error}',
        'lib.retry': 'Retry',
        'lib.copied': 'Prompt copied',
        'lib.copyFailed': 'Copy failed; select the body and copy manually',
        'lib.saved': 'Saved',
        'lib.deleted': 'Deleted',
        'lib.duplicated': 'Duplicate created',
        'lib.pinned': 'Pinned',
        'lib.unpinned': 'Unpinned',
        'lib.updated': 'Updated {time}',
        'lib.used': 'Used {count}×',
        'lib.skill': 'Skill',
        'lib.detailTitle': 'Action details',
        'lib.detailMeta': 'Category: {category}',
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
        'editor.prompt': 'Prompt body',
        'editor.promptPlaceholder': 'Write the prompt you send to the agent…',
        'editor.promptHint': 'Markdown is fine; {{args}} is the argument slot, {{date}} is today.',
        'editor.pinned': 'Pin to top',
        'editor.required': 'A name and a body are required.',
        'delete.title': 'Delete this Action?',
        'delete.copy': '“{name}” leaves the shelf permanently.',
        'import.title': 'Import Actions',
        'import.jsonTab': 'Paste JSON',
        'import.skillTab': 'From Skill',
        'import.jsonHint': 'Paste JSON exported by this plugin, or choose a file.',
        'import.chooseFile': 'Choose file…',
        'import.mode': 'Import mode',
        'import.merge': 'Merge (same id overwrites)',
        'import.replace': 'Replace all',
        'import.run': 'Import',
        'import.invalid': 'That JSON could not be parsed',
        'import.done': 'Imported: {added} added, {updated} updated',
        'import.skillCwd': 'Project directory (optional)',
        'import.skillCwdHint': 'Empty scans the profile default; project-level Skills need the project root.',
        'import.skillLoad': 'Load Skills',
        'import.skillEmpty': 'No Skills found. Check the directory.',
        'import.skillImport': 'Import as Action',
        'import.skillDone': 'Imported: {name}',
        'import.skillUnavailable': 'The Skills service is not enabled in this profile',
        'category.title': 'Categories',
        'category.empty': 'No categories yet',
        'category.rename': 'Rename',
        'category.delete': 'Delete',
        'category.deleteHint': 'Its Actions move to Uncategorized.',
        'category.deleteConfirm': 'Delete category “{name}”?',
        'category.deleteConfirmDesc': 'It still contains {count} Action(s). They move to Uncategorized; the Actions themselves are kept.',
        'category.deleteConfirmEmpty': 'This category has no Actions, so it is safe to delete.',
        'category.confirmDelete': 'Delete category',
        'category.name': 'New name',
        'category.count': '{count}',
        'palette.title': 'Pick an Action',
        'palette.search': 'Search Actions…',
        'palette.empty': 'No Actions yet',
        'palette.emptyCopy': 'Create one, or capture the current draft, and it is one search away from now on.',
        'palette.noMatch': 'No matching Action',
        'palette.args': 'Arguments (optional; replaces {{args}})',
        'palette.insert': 'Insert',
        'palette.send': 'Send',
        'palette.capture': 'Save draft',
        'palette.manage': 'Manage',
        'palette.inserted': 'Inserted into the composer',
        'palette.insertedAtCaret': 'Inserted at the caret',
        'palette.sent': 'Inserted and sent',
        'palette.insertFailed': 'This session cannot be written to right now',
        'palette.sendFailed': 'Send failed; the draft is kept',
        'palette.busy': 'Sending — try again in a moment',
        'palette.captureTitle': 'Save the current draft as an Action',
        'palette.captureEmpty': 'The draft is empty — write something first.',
        'palette.capturePrompt': 'Body',
        'palette.captureDone': 'Saved as “{name}”',
        'palette.hintNav': 'navigate',
        'palette.hintInsert': 'insert',
        'palette.hintSend': 'send',
        'palette.hintClose': 'close',
        'palette.hintTab': 'category',
        'palette.noSession': 'Open a conversation composer first.',
        'palette.skillsHint': 'Bulk import lives in Manage → Import → From Skill.',
        'palette.refHint': 'Inserts a reference: the transcript shows “{name}” only',
        'palette.refArgsHint': 'Arguments are filled, so the full text is inserted',
        'palette.refInserted': 'Reference inserted',
        'palette.usage': 'Used {count}×',
        'palette.pinned': 'Pinned',
        'trigger.label': 'Actions',
        'trigger.tooltip': 'Action shelf ({keys})',
        'shortcut.open': 'Open the Actions palette',
        'settings.nav': 'Action Hub',
        'settings.title': 'Action Hub',
        'settings.desc': 'Palette, insertion behavior, and where the data lives.',
        'settings.behavior': 'Behavior',
        'settings.closeAfterInsert': 'Close the palette after inserting',
        'settings.closeAfterInsertDesc': 'Then Enter sends right away. Turn off to insert several Actions in a row.',
        'settings.hotkey': 'Global shortcut',
        'settings.hotkeyDesc': 'Opens the Actions palette in any conversation.',
        'settings.hotkeyManage': 'View or change it in Settings → General → Shortcuts.',
        'settings.trigger': 'Show the composer button',
        'settings.triggerDesc': 'The global shortcut keeps working when off.',
        'settings.data': 'Data',
        'settings.dataDesc': 'Actions are stored locally at {path} ({count} total).',
        'settings.openLibrary': 'Open library',
        'settings.export': 'Export all',
        'settings.about': 'About',
        'settings.aboutDesc': 'Action Hub {version} · registers no agent tool and injects no context.',
        'settings.hotkeyKeys': 'Ctrl + Shift + A',
        'settings.saved': 'Saved',
        'notice.savedLocally': 'Saved on this machine',
        'skill.source': 'Imported from Skill',
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

    function sortActions(actions, sortBy = 'recent') {
      return [...actions].sort((left, right) => {
        if ((left.pinned === true) !== (right.pinned === true)) return left.pinned === true ? -1 : 1;
        if (sortBy === 'name') return (left.name || '').localeCompare(right.name || '', 'zh-CN');
        if (sortBy === 'created') return (right.createdAt ?? 0) - (left.createdAt ?? 0);
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
      scored.sort((left, right) => {
        const pinned = (right.action.pinned === true ? 1 : 0) - (left.action.pinned === true ? 1 : 0);
        if (pinned !== 0) return pinned;
        if (left.score !== right.score) return right.score - left.score;
        if (sortBy === 'name') return (left.action.name || '').localeCompare(right.action.name || '', 'zh-CN');
        if (sortBy === 'created') return (right.action.createdAt ?? 0) - (left.action.createdAt ?? 0);
        const recent = (right.action.usage?.lastAt ?? 0) - (left.action.usage?.lastAt ?? 0);
        if (recent !== 0) return recent;
        return (left.action.name || '').localeCompare(right.action.name || '', 'zh-CN');
      });
      return scored.map((entry) => entry.action);
    }

    // ----------------------------------------------------------------- stores

    function createHub() {
      const listeners = new Set();
      let snapshot = { status: 'idle', actions: [], meta: {}, error: '' };
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
            set({ status: 'ready', actions: data.actions ?? [], meta: data.meta ?? {}, error: '' });
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
        if (Array.isArray(data.actions)) set({ ...snapshot, status: 'ready', actions: data.actions, error: '' });
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
      const defaults = { closeAfterInsert: true, hotkeyEnabled: true, showTrigger: true };
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

    const SHORTCUT_ID = 'action-hub.palette';
    const SHORTCUT_FALLBACK_KEYS = MAC ? ['⌘', '⇧', '.'] : ['Ctrl', '+', 'Shift', '+', '.'];

    /**
     * Keep the palette shortcut inside the Harness shortcut registry, so it
     * appears in Settings → General → Shortcuts and can be rebound there.
     * Falls back to the same physical chord's own listener when the registry is
     * unavailable or refused the default.
     */
    function createShortcutStore(ctx, palette, prefs, t) {
      const service = typeof ctx?.get === 'function' ? ctx.get('shortcuts') : ctx?.shortcuts;
      const listeners = new Set();
      let state = { available: service !== undefined, registered: false, keys: SHORTCUT_FALLBACK_KEYS.slice(), aria: undefined };
      let dispose = null;
      let manualOff = null;
      let syncing = false;

      const emit = () => {
        for (const listener of [...listeners]) listener(state);
      };

      const refreshKeys = () => {
        let keys = null;
        let aria;
        try {
          const rows = service?.catalog?.getSnapshot?.();
          const row = Array.isArray(rows) ? rows.find((entry) => entry.id === SHORTCUT_ID) : undefined;
          if (row !== undefined && Array.isArray(row.keys) && row.keys.length > 0) {
            keys = row.keys;
            aria = row.aria;
          }
        } catch {
          keys = null;
        }
        const nextKeys = keys ?? (state.registered ? SHORTCUT_FALLBACK_KEYS : state.keys);
        state = { ...state, keys: nextKeys, aria: aria ?? state.aria };
        emit();
      };

      const togglePalette = () => {
        const current = palette.get();
        if (current.open) {
          palette.close();
          return;
        }
        if (current.bridge === null) return;
        palette.open();
      };

      const installManual = () => {
        if (manualOff !== null) return;
        const onKey = (event) => {
          if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return;
          if (event.key !== '.' && event.code !== 'Period') return;
          if (!prefs.get().hotkeyEnabled) return;
          if (palette.get().bridge === null) return;
          event.preventDefault();
          event.stopPropagation();
          togglePalette();
        };
        document.addEventListener('keydown', onKey, true);
        manualOff = () => document.removeEventListener('keydown', onKey, true);
      };

      const sync = () => {
        if (syncing) return;
        syncing = true;
        try {
          dispose?.();
          dispose = null;
          manualOff?.();
          manualOff = null;
          if (!prefs.get().hotkeyEnabled) {
            state = { ...state, registered: false };
            emit();
            return;
          }
          if (service === undefined || typeof service.register !== 'function') {
            installManual();
            state = { ...state, available: false, registered: false, keys: SHORTCUT_FALLBACK_KEYS.slice() };
            emit();
            return;
          }
          const defaults = {};
          for (const runtime of ['desktop', 'web']) {
            for (const platform of ['macos', 'windows', 'linux']) {
              defaults[`${runtime}:${platform}`] = { code: 'Period', modifiers: ['primary', 'shift'] };
            }
          }
          try {
            dispose = service.register({
              id: SHORTCUT_ID,
              label: () => t('shortcut.open'),
              aliases: ['action hub', 'actions', 'palette', '收藏夹'],
              defaults,
              regions: ['page', 'editable'],
              modals: [],
              resolve: () => ({ status: 'handled', run: togglePalette }),
            });
            state = { ...state, available: true, registered: true };
          } catch (error) {
            console.warn('[action-hub] shortcut registration failed, using a local listener:', error);
            installManual();
            state = { ...state, available: false, registered: false, keys: SHORTCUT_FALLBACK_KEYS.slice() };
          }
          refreshKeys();
          setTimeout(refreshKeys, 0);
        } finally {
          syncing = false;
        }
      };

      const offPrefs = prefs.subscribe(() => sync());
      const offCatalog = typeof service?.catalog?.subscribe === 'function'
        ? service.catalog.subscribe(() => refreshKeys())
        : undefined;
      sync();

      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        sync,
        keysText: () => (state.keys.length > 0 ? state.keys.join('') : SHORTCUT_FALLBACK_KEYS.join('')),
        dispose() {
          offPrefs();
          offCatalog?.();
          dispose?.();
          manualOff?.();
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
      const pattern = /(^|\s)\/(ah-[0-9a-f]{6,20})(?=\s|$)/gu;
      try {
        userText.register({
          id: 'action-hub',
          order: 15,
          match(text, from) {
            pattern.lastIndex = from;
            for (let token = pattern.exec(text); token !== null; token = pattern.exec(text)) {
              const name = chipNames.get(token[2]);
              if (name === undefined) continue;
              const start = token.index + token[1].length;
              return { id: 'action-hub', start, end: start + 1 + token[2].length, data: { name, handle: token[2] } };
            }
            return undefined;
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
        mode: 'browse', // 'browse' | 'capture'
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
      chevron: iconOf([{ d: 'M4 6.2 8 10l4-3.8' }]),
      check: iconOf([{ d: 'M2.8 8.4 6.4 12l6.8-8' }]),
      sparkle: iconOf([{ d: 'M8 2.2v3.2M8 10.6v3.2M2.2 8h3.2M10.6 8h3.2' }, { d: 'M4.9 4.9l2 2M9.1 9.1l2 2M11.1 4.9l-2 2M6.9 9.1l-2 2' }]),
      keyboard: iconOf([{ d: 'M2.2 5.2h11.6v5.6H2.2z' }, { d: 'M4.2 7.2h.1M6.2 7.2h.1M8.2 7.2h.1M10.2 7.2h.1M4.2 9.2h7.4' }]),
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
        className: 'ah-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': props.title,
        tabIndex: -1,
        ref: panelRef,
      },
      h('div', { className: 'ah-modal-head' },
        h('h2', { className: 'ah-modal-title' }, props.title),
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
          action.category ? h('span', { className: 'ah-badge ah-badge-accent' }, action.category) : h('span', { className: 'ah-badge' }, t('lib.uncategorized')),
          action.source?.kind === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : null,
          (action.tags ?? []).slice(0, 3).map((tag) => h('span', { key: tag, className: 'ah-badge' }, `#${tag}`))),
        action.description ? h('p', { className: 'ah-desc' }, action.description) : null),
      h('div', { className: 'ah-row-actions' },
        h('span', { className: 'ah-meta' }, used > 0 ? t('lib.used', { count: used }) : t('lib.updated', { time: relativeTime(action.updatedAt) })),
        h(Button, { ghost: true, iconOnly: true, small: true, title: t('action.edit'), onClick: (event) => { event.stopPropagation(); props.onEdit(action); } }, h(Icons.edit, { size: 13 })),
        h(Button, { ghost: true, iconOnly: true, small: true, title: t('action.duplicate'), onClick: (event) => { event.stopPropagation(); props.onDuplicate(action); } }, h(Icons.copy, { size: 13 })),
        h(Button, { ghost: true, iconOnly: true, small: true, title: t('action.delete'), onClick: (event) => { event.stopPropagation(); props.onDelete(action); } }, h(Icons.trash, { size: 13 }))));
    }

    function EditorDialog(props) {
      const { t, initial } = props;
      const [form, setForm] = React.useState(() => ({
        name: initial?.name ?? '',
        category: initial?.category ?? '',
        tags: Array.isArray(initial?.tags) ? initial.tags.join(', ') : '',
        argsHint: initial?.argsHint ?? '',
        description: initial?.description ?? '',
        prompt: initial?.prompt ?? '',
        pinned: initial?.pinned === true,
      }));
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const patch = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

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
          });
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
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
      h('div', { className: 'ah-settings-row' },
        h('div', { className: 'ah-settings-row-main' },
          h('span', { className: 'ah-settings-row-title' }, t('editor.pinned'))),
        h(Switch, { checked: form.pinned, label: t('editor.pinned'), onChange: (value) => setForm((previous) => ({ ...previous, pinned: value })) })),
      error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error));
    }

    function ImportDialog(props) {
      const { t } = props;
      const [tab, setTab] = React.useState('json');
      const [text, setText] = React.useState('');
      const [mode, setMode] = React.useState('merge');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [cwd, setCwd] = React.useState('');
      const [skills, setSkills] = React.useState(null);
      const [skillError, setSkillError] = React.useState('');
      const [skillBusy, setSkillBusy] = React.useState(false);
      const fileRef = React.useRef(null);

      const runImport = async () => {
        setError('');
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          setError(t('import.invalid'));
          return;
        }
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.actions) ? parsed.actions : null;
        if (list === null) {
          setError(t('import.invalid'));
          return;
        }
        setBusy(true);
        try {
          const data = await api('/import', { actions: list, mode });
          props.notify(t('import.done', { added: data.added, updated: data.updated }), 'ok');
          props.onDone();
          props.onClose();
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      const loadSkills = async () => {
        setSkillBusy(true);
        setSkillError('');
        try {
          const query = cwd.trim() === '' ? '' : `?cwd=${encodeURIComponent(cwd.trim())}`;
          const data = await api(`/skills${query}`);
          setSkills(data.skills ?? []);
          if (data.warning) setSkillError(data.warning);
          if (data.unavailable) setSkillError(t('import.skillUnavailable'));
        } catch (failure) {
          setSkillError(describeError(failure));
        } finally {
          setSkillBusy(false);
        }
      };

      const importSkill = async (skill) => {
        setSkillBusy(true);
        setSkillError('');
        try {
          await api('/import-skill', { name: skill.name, cwd: cwd.trim() === '' ? undefined : cwd.trim() });
          props.notify(t('import.skillDone', { name: skill.name }), 'ok');
          props.onDone();
        } catch (failure) {
          setSkillError(describeError(failure));
        } finally {
          setSkillBusy(false);
        }
      };

      return h(Modal, {
        title: t('import.title'),
        t,
        onClose: props.onClose,
        footer: tab === 'json'
          ? h(React.Fragment, null,
            h(Button, { onClick: props.onClose }, t('action.cancel')),
            h(Button, { primary: true, disabled: busy || text.trim() === '', onClick: runImport }, t('import.run')))
          : h(Button, { onClick: props.onClose }, t('action.cancel')),
      },
      h('div', { className: 'ah-tabs' },
        h('button', { type: 'button', className: 'ah-tab', 'data-active': tab === 'json', onClick: () => setTab('json') }, t('import.jsonTab')),
        h('button', { type: 'button', className: 'ah-tab', 'data-active': tab === 'skill', onClick: () => setTab('skill') }, t('import.skillTab'))),
      tab === 'json'
        ? h(React.Fragment, null,
          h('p', { className: 'ah-hint' }, t('import.jsonHint')),
          h('textarea', { className: 'ah-textarea', value: text, rows: 9, spellCheck: false, placeholder: '{ "actions": [ … ] }', onChange: (event) => setText(event.target.value) }),
          h('div', { className: 'ah-radio-row' },
            h('span', { className: 'ah-hint' }, `${t('import.mode')}:`),
            h('label', { className: 'ah-hint' }, h('input', { type: 'radio', checked: mode === 'merge', onChange: () => setMode('merge') }), ` ${t('import.merge')}`),
            h('label', { className: 'ah-hint' }, h('input', { type: 'radio', checked: mode === 'replace', onChange: () => setMode('replace') }), ` ${t('import.replace')}`)),
          h('div', null,
            h('input', {
              ref: fileRef,
              type: 'file',
              accept: '.json,application/json',
              className: 'ah-hidden',
              onChange: async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                try {
                  setText(await file.text());
                  setError('');
                } catch (failure) {
                  setError(describeError(failure));
                }
              },
            }),
            h(Button, { onClick: () => fileRef.current?.click() }, h(Icons.upload, { size: 13 }), t('import.chooseFile'))))
        : h(React.Fragment, null,
          h('div', { className: 'ah-field' },
            h('label', { className: 'ah-label' }, t('import.skillCwd')),
            h('input', { className: 'ah-input', value: cwd, placeholder: 'C:\\path\\to\\project', onChange: (event) => setCwd(event.target.value) }),
            h('span', { className: 'ah-hint' }, t('import.skillCwdHint'))),
          h('div', null, h(Button, { disabled: skillBusy, onClick: loadSkills }, h(Icons.folder, { size: 13 }), t('import.skillLoad'))),
          skills === null
            ? null
            : skills.length === 0
              ? h('div', { className: 'ah-notice' }, t('import.skillEmpty'))
              : h('div', { className: 'ah-list-plain' }, skills.map((skill) => h('div', { key: skill.name, className: 'ah-plain-item' },
                h('div', { className: 'ah-plain-main' },
                  h('span', { className: 'ah-plain-name' }, skill.name),
                  h('span', { className: 'ah-plain-desc', title: skill.description }, skill.description || '')),
                h(Button, { small: true, disabled: skillBusy, onClick: () => importSkill(skill) }, t('import.skillImport')))))),
      error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error),
      skillError === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, skillError));
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

    function createPage(hub) {
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
        const [categoryDialog, setCategoryDialog] = React.useState(false);
        const [notice, setNotice] = React.useState({ text: '', kind: '' });

        const notify = React.useCallback((text, kind = 'ok') => setNotice({ text, kind }), []);
        React.useEffect(() => {
          if (notice.text === '') return undefined;
          const timer = setTimeout(() => setNotice({ text: '', kind: '' }), 3200);
          return () => clearTimeout(timer);
        }, [notice]);

        const actions = snapshot.actions ?? [];
        const categories = React.useMemo(() => categoriesOf(actions), [actions]);
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

        const duplicate = async (action) => {
          try {
            await hub.call('/duplicate', { id: action.id });
            notify(t('lib.duplicated'), 'ok');
          } catch (failure) {
            notify(describeError(failure), 'error');
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

        const exportAll = async () => {
          try {
            const data = await api('/export');
            const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `dsh-actions-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            notify(t('lib.saved'), 'ok');
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

        const sortLabels = { recent: t('lib.sortRecent'), name: t('lib.sortName'), created: t('lib.sortCreated') };

        const body = [];
        body.push(h('header', { key: 'head', className: 'ah-head' },
          h('div', { className: 'ah-head-main' },
            h('h1', { className: 'ah-title' }, t('app.title')),
            h('p', { className: 'ah-sub' }, t('app.subtitle'))),
          h('div', { className: 'ah-head-actions' },
            h(Button, { primary: true, onClick: () => setEditor(null) }, h(Icons.plus, { size: 14 }), t('action.new')),
            h(Button, { onClick: () => setImporting(true) }, h(Icons.upload, { size: 13 }), t('action.import')),
            h(Button, { onClick: exportAll }, h(Icons.download, { size: 13 }), t('action.export')),
            h(Button, { ghost: true, iconOnly: true, title: t('action.refresh'), onClick: () => { void hub.refresh(true).catch(() => {}); } }, h(Icons.refresh, { size: 14 })))));

        if (notice.text !== '') body.push(h('div', { key: 'notice', className: 'ah-notice', 'data-kind': notice.kind, role: 'status' }, notice.text));

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
                    onDuplicate: duplicate,
                    onDelete: setDeleting,
                  }))))));

        if (editor !== undefined) {
          body.push(h(EditorDialog, {
            key: 'editor',
            initial: editor,
            categories: categories.map(([name]) => name),
            t,
            onSave: save,
            onClose: () => setEditor(undefined),
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
              h(Button, { onClick: () => { setEditor(detail); setDetail(null); } }, h(Icons.edit, { size: 13 }), t('action.edit')),
              h(Button, { danger: true, onClick: () => setDeleting(detail) }, h(Icons.trash, { size: 13 }), t('action.delete'))),
          },
          h('div', { className: 'ah-preview-meta' },
            detail.category ? h('span', { className: 'ah-badge ah-badge-accent' }, detail.category) : h('span', { className: 'ah-badge' }, t('lib.uncategorized')),
            detail.pinned ? h('span', { className: 'ah-badge ah-badge-warn' }, t('palette.pinned')) : null,
            detail.source?.kind === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : null,
            (detail.tags ?? []).map((tag) => h('span', { key: tag, className: 'ah-badge' }, `#${tag}`)),
            h('span', { className: 'ah-count' }, detail.usage?.count > 0 ? t('lib.used', { count: detail.usage.count }) : t('lib.updated', { time: relativeTime(detail.updatedAt) }))),
          detail.description ? h('p', { className: 'ah-desc' }, detail.description) : null,
          h('pre', { className: 'ah-code' }, detail.prompt),
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
        if (importing) {
          body.push(h(ImportDialog, {
            key: 'import',
            t,
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

        return h('div', { className: 'ah-page' }, body);
      };
    }

    // --------------------------------------------------------------- palette

    function createPaletteView(hub, palette, prefsRef) {
      return function ActionPalette(props) {
        const t = translate(props);
        const state = usePalette(palette);
        const snapshot = useHub(hub);
        const prefs = usePrefs(prefsRef);
        const searchRef = React.useRef(null);
        const listRef = React.useRef(null);
        const [selectedId, setSelectedId] = React.useState(null);
        const [args, setArgs] = React.useState('');
        const [capture, setCapture] = React.useState({ name: '', category: '', tags: '', error: '', busy: false });
        const [toast, setToast] = React.useState({ text: '', kind: 'ok' });

        const actions = snapshot.actions ?? [];
        const categories = React.useMemo(() => categoriesOf(actions), [actions]);
        const visible = React.useMemo(
          () => visibleActions(actions, { query: state.query, category: state.category }),
          [actions, state.category, state.query],
        );
        const selected = visible.find((action) => action.id === selectedId) ?? visible[0] ?? null;

        React.useEffect(() => {
          if (!state.open) return undefined;
          setSelectedId(null);
          setArgs('');
          setCapture({ name: '', category: '', tags: '', error: '', busy: false });
          setToast({ text: '', kind: 'ok' });
          if (hub.get().status === 'idle' || hub.get().status === 'error') void hub.refresh().catch(() => {});
          const timer = setTimeout(() => searchRef.current?.focus(), 20);
          return () => clearTimeout(timer);
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

        React.useEffect(() => {
          if (!state.open) return undefined;
          const onKey = (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          };
          document.addEventListener('keydown', onKey, true);
          return () => document.removeEventListener('keydown', onKey, true);
        }, [state.open, close]);

        if (!state.open) return null;

        const bridge = state.bridge;
        const canWrite = Boolean(bridge?.inputActions);

        const showToast = (text, kind = 'ok') => {
          setToast({ text, kind });
          setTimeout(() => setToast((current) => (current.text === text ? { text: '', kind: 'ok' } : current)), 2600);
        };

        const doInsert = (action, mode) => {
          if (!canWrite) {
            showToast(t('palette.insertFailed'), 'error');
            return;
          }
          const inputActions = bridge.inputActions;
          const draft = bridge.input?.draft ?? '';
          const handle = snapshot.meta?.handles?.[action.id];
          const referenceMode = args.trim() === '' && typeof handle === 'string' && handle !== '';
          const referenceText = referenceMode ? `/${handle}` : '';
          const text = referenceMode ? referenceText : expandPrompt(action.prompt, { args });
          let placed = false;
          let atCaret = false;
          let referenced = false;
          try {
            const span = typeof inputActions.captureInsertion === 'function' ? inputActions.captureInsertion() : null;
            if (span && typeof inputActions.insertText === 'function') {
              const result = inputActions.insertText(referenceMode ? `${referenceText} ` : text, span);
              placed = result !== false;
              atCaret = placed;
              referenced = placed && referenceMode;
            }
          } catch {
            placed = false;
          }
          if (!placed) {
            try {
              inputActions.setDraft(composeDraft(draft, referenceMode ? `${referenceText} ` : text));
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
          if (prefs.closeAfterInsert) setTimeout(() => palette.close(), 220);
        };

        const saveCapture = async () => {
          const draft = bridge?.input?.draft ?? '';
          if (draft.trim() === '') {
            setCapture((current) => ({ ...current, error: t('palette.captureEmpty') }));
            return;
          }
          if (capture.name.trim() === '') {
            setCapture((current) => ({ ...current, error: t('editor.required') }));
            return;
          }
          setCapture((current) => ({ ...current, busy: true, error: '' }));
          try {
            await hub.call('/create', {
              action: {
                name: capture.name.trim(),
                category: capture.category.trim(),
                tags: capture.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag !== ''),
                description: '',
                prompt: draft,
                pinned: false,
              },
            });
            setToast({ text: t('palette.captureDone', { name: capture.name.trim() }), kind: 'ok' });
            palette.update({ mode: 'browse' });
            setCapture({ name: '', category: '', tags: '', error: '', busy: false });
          } catch (failure) {
            setCapture((current) => ({ ...current, busy: false, error: describeError(failure) }));
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
          } else if (event.key === 'Tab') {
            event.preventDefault();
            const names = ['', ...categories.map(([name]) => name)];
            const index = names.indexOf(state.category);
            const next = names[(index + (event.shiftKey ? -1 : 1) + names.length) % names.length];
            palette.update({ category: next });
          }
        };

        const header = state.mode === 'capture'
          ? h('div', { className: 'ah-palette-search' },
            h('h2', { className: 'ah-preview-title', style: { margin: 0, flex: '1 1 auto' } }, t('palette.captureTitle')),
            h(Button, { ghost: true, iconOnly: true, small: true, onClick: close, title: t('action.close') }, h(Icons.close, { size: 13 })))
          : h('div', { className: 'ah-palette-search' },
            h(SearchField, { inputRef: searchRef, value: state.query, placeholder: t('palette.search'), onChange: (value) => palette.update({ query: value }), onKeyDown: onSearchKey }),
            h(Kbd, null, 'Esc'));

        const catRow = state.mode === 'capture' ? null : h('div', { className: 'ah-palette-cats' },
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
              'aria-selected': action.id === selected?.id,
              onMouseEnter: () => setSelectedId(action.id),
              onClick: () => doInsert(action, 'insert'),
            },
            h('div', { className: 'ah-result-main' },
              h('div', { className: 'ah-result-title' },
                action.pinned ? h('span', { className: 'ah-result-star' }, h(Icons.star, { size: 11, filled: true })) : null,
                h('span', { className: 'ah-result-name' }, action.name),
                action.category ? h('span', { className: 'ah-badge ah-badge-accent' }, action.category) : null),
              h('span', { className: 'ah-result-desc' }, action.description || (action.argsHint ? `${action.argsHint}` : action.prompt.slice(0, 80)))))));

        const preview = selected === null
          ? h('div', { className: 'ah-preview' },
            h('div', { className: 'ah-preview-empty' },
              h('div', { className: 'ah-empty-title' }, actions.length === 0 ? t('palette.empty') : t('palette.noMatch')),
              h('div', { className: 'ah-empty-copy' }, actions.length === 0 ? t('palette.emptyCopy') : ''),
              actions.length === 0
                ? h('div', { className: 'ah-empty-actions' },
                  h(Button, { primary: true, onClick: () => palette.update({ mode: 'capture' }) }, h(Icons.plus, { size: 14 }), t('palette.capture')),
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
              selected.source?.kind === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : null,
              (selected.tags ?? []).map((tag) => h('span', { key: tag, className: 'ah-badge' }, `#${tag}`)),
              selected.usage?.count > 0 ? h('span', { className: 'ah-count' }, t('palette.usage', { count: selected.usage.count })) : null),
            selected.description ? h('p', { className: 'ah-preview-desc' }, selected.description) : null,
            selected.argsHint ? h('p', { className: 'ah-hint' }, `${t('editor.args')}: ${selected.argsHint}`) : null,
            selected !== null && snapshot.meta?.referencing && typeof snapshot.meta?.handles?.[selected.id] === 'string'
              ? h('p', { className: 'ah-hint' }, args.trim() === ''
                ? t('palette.refHint', { name: selected.name })
                : t('palette.refArgsHint'))
              : null,
            h('pre', { className: 'ah-code ah-preview-body' }, selected.prompt));

        const captureDraft = typeof bridge?.input?.draft === 'string' ? bridge.input.draft.trim() : '';
        const captureView = h('div', { className: 'ah-capture' },
          h('div', { className: 'ah-field' },
            h('label', { className: 'ah-label' }, t('editor.name')),
            h('input', {
              className: 'ah-input',
              value: capture.name,
              autoFocus: true,
              placeholder: t('editor.namePlaceholder'),
              onChange: (event) => setCapture((current) => ({ ...current, name: event.target.value })),
              onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); void saveCapture(); } },
            })),
          h('div', { className: 'ah-field-row' },
            h('div', { className: 'ah-field' },
              h('label', { className: 'ah-label' }, t('editor.category')),
              h('input', { className: 'ah-input', value: capture.category, list: 'ah-capture-categories', onChange: (event) => setCapture((current) => ({ ...current, category: event.target.value })) }),
              h('datalist', { id: 'ah-capture-categories' }, categories.map(([name]) => h('option', { key: name, value: name })))),
            h('div', { className: 'ah-field' },
              h('label', { className: 'ah-label' }, t('editor.tags')),
              h('input', { className: 'ah-input', value: capture.tags, placeholder: t('editor.tagsPlaceholder'), onChange: (event) => setCapture((current) => ({ ...current, tags: event.target.value })) }))),
          h('div', { className: 'ah-field' },
            h('label', { className: 'ah-label' }, t('palette.capturePrompt')),
            h('pre', { className: 'ah-code' }, captureDraft || t('palette.captureEmpty'))),
          capture.error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, capture.error),
          h('div', { className: 'ah-actions' },
            h('div', { style: { flex: '1 1 auto' } }),
            h(Button, { onClick: () => palette.update({ mode: 'browse' }) }, t('action.cancel')),
            h(Button, { primary: true, disabled: capture.busy || captureDraft === '', onClick: saveCapture }, t('action.save'))));

        const footer = state.mode === 'capture' ? null : h('div', { className: 'ah-palette-foot' },
          h('div', { className: 'ah-args' },
            h('input', {
              className: 'ah-input',
              value: args,
              placeholder: t('palette.args'),
              'aria-label': t('palette.args'),
              onChange: (event) => setArgs(event.target.value),
            })),
          h('div', { className: 'ah-hints' },
            h('span', null, h(Kbd, null, '↑↓'), ` ${t('palette.hintNav')}`),
            h('span', null, h(Kbd, null, '↵'), ` ${t('palette.hintInsert')}`),
            h('span', null, h(Kbd, null, 'Ctrl+↵'), ` ${t('palette.hintSend')}`)),
          h('div', { className: 'ah-actions' },
            h(Button, { ghost: true, small: true, onClick: () => palette.update({ mode: 'capture' }) }, h(Icons.plus, { size: 13 }), t('palette.capture')),
            h(Button, { ghost: true, small: true, onClick: () => { palette.close(); props.ctx.get('layout')?.selectPanel?.(PANEL_ID); } }, t('palette.manage')),
            h(Button, { small: true, primary: true, onClick: () => { if (selected) doInsert(selected, 'insert'); }, disabled: !canWrite || selected === null }, h(Icons.arrow, { size: 13 }), t('palette.insert')),
            h(Button, { small: true, onClick: () => { if (selected) doInsert(selected, 'send'); }, disabled: !canWrite || selected === null }, h(Icons.send, { size: 13 }), t('palette.send'))));

        const toastView = toast.text === '' ? null : h('div', { className: 'ah-toast', 'data-kind': toast.kind, role: 'status' }, toast.text);

        const bodyContent = state.mode === 'capture'
          ? captureView
          : h(React.Fragment, null,
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
        const keys = shortcut.keys.length > 0 ? shortcut.keys.join('') : (MAC ? '⌘⇧.' : 'Ctrl+Shift+.');
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
                h('span', { className: 'ah-settings-row-title' }, t('settings.hotkey')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.hotkeyDesc')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.hotkeyManage'))),
              h('span', { className: 'ah-kbd' }, shortcuts.keys.length > 0 ? shortcuts.keys.join('') : (MAC ? '⌘⇧.' : 'Ctrl+Shift+.')),
              h(Switch, { checked: state.hotkeyEnabled, label: t('settings.hotkey'), onChange: (value) => { prefs.set({ hotkeyEnabled: value }); saved(t('settings.saved')); } }))),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.data')),
            h('p', { className: 'ah-settings-row-desc' }, t('settings.dataDesc', { path: snapshot.meta.dataFileDisplay ?? snapshot.meta.dataFile ?? '—', count: snapshot.actions.length })),
            h('div', { className: 'ah-actions' },
              h(Button, { onClick: () => props.ctx.get('layout')?.selectPanel?.(PANEL_ID) }, t('settings.openLibrary')),
              h(Button, { onClick: async () => {
                try {
                  const data = await api('/export');
                  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `dsh-actions-${new Date().toISOString().slice(0, 10)}.json`;
                  document.body.appendChild(anchor);
                  anchor.click();
                  document.body.removeChild(anchor);
                  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
      const shortcuts = createShortcutStore(ctx, palette, prefs, t);

      setChipNames(hub.get());
      ctx.effect(() => hub.subscribe(setChipNames), 'action-hub: reference names');
      installActionChipRule(ctx);

      ctx.effect(() => () => {
        hub.dispose();
        shortcuts.dispose();
        palette.close();
      }, 'action-hub: stores');

      const Page = createPage(hub);
      const PaletteView = createPaletteView(hub, palette, prefs);
      const SessionBridge = createSessionBridge(palette);
      const Trigger = createTrigger(palette);
      const Settings = createSettings(hub, prefs);

      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, Page));

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 32,
        label: () => t('app.name'),
        locale: NS,
      }, PanelIcon));

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
