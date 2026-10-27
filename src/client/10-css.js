    const CSS = `
      .ah-page { box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; height: 100%; min-height: 0; padding: 24px 26px 26px; color: var(--dsw-alias-label-primary); }
      .ah-head { display: flex; align-items: flex-start; gap: 18px; flex-wrap: wrap; }
      .ah-head-main { flex: 1 1 320px; min-width: 0; }
      .ah-title { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 660; letter-spacing: .01em; }
      .ah-sub { margin: 7px 0 0; font-size: 12.5px; line-height: 1.65; color: var(--dsw-alias-label-secondary); max-width: 74ch; }
      .ah-head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ah-switch-field { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dsw-alias-label-secondary); cursor: pointer; white-space: nowrap; }
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
      .ah-search input { width: 100%; box-sizing: border-box; height: 34px; padding: 0 42px 0 32px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12.5px; outline: none; }
      .ah-search input:focus { border-color: var(--dsw-alias-brand-primary); }
      .ah-search-mark { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); display: flex; color: var(--dsw-alias-label-secondary); pointer-events: none; }
      .ah-search-regex { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); min-width: 26px; height: 24px; padding: 0 5px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; font-weight: 600; line-height: 1; cursor: pointer; }
      .ah-search-regex:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
      .ah-search-regex[data-active="true"] { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-overlay); }
      .ah-search-regex:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .ah-chip { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary); border-radius: 999px; height: 26px; padding: 0 10px; font: inherit; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
      .ah-chip:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
      .ah-chip[data-active="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
      .ah-chip-count { font-size: 10.5px; opacity: .7; }
      .ah-count { font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .ah-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 218px minmax(0, 1fr); gap: 16px; }
      .ah-body-plain { grid-template-columns: minmax(0, 1fr); }
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
      .ah-export-mode { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 9px 11px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-2); }
      .ah-export-mode-head { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
      .ah-export-mode-title { font-size: 13px; font-weight: 650; }
      .ah-export-mode-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .ah-sort { display: flex; align-items: center; gap: 4px; }
      .ah-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 2px; }
      .ah-row { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 10px; padding: 10px 12px; display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
      .ah-row[data-selected="true"] { border-color: var(--dsw-alias-state-accent-primary); background: var(--dsw-alias-bg-layer-2); }
      .ah-row-check { width: 24px; height: 24px; flex: 0 0 auto; margin: 1px 0 0; accent-color: var(--dsw-alias-state-accent-primary); cursor: pointer; }
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
      .ah-action-check[data-state="blocked"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); border-style: dashed; color: var(--dsw-alias-label-tertiary); }
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
      .ah-palette-sort { appearance: none; height: 34px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; cursor: pointer; flex: 0 0 auto; }
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
