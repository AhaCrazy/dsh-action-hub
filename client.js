/**
 * dsh-action-hub — Client half (Web UI).
 *
 * Three registrations:
 *   - `main` keyed by PANEL_ID: the full management page (create/edit/delete/
 *     import/export, search, categories);
 *   - `sidebar.panellist`: the panel icon that opens that page;
 *   - `conversation.composer.dock`: a quick launcher that inserts one Action's
 *     prompt into the current composer through the shipped `inputActions` API.
 *
 * The dock is the only place an Action reaches a conversation, and it happens
 * because the user clicked it. Nothing here registers a tool or prompt section.
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

    /** Placeholder spellings replaced at insertion time; keep in sync with store.js. */
    const ARG_TOKENS = ['{{args}}', '{{ARGS}}', '$ARGUMENTS', '{{input}}'];

    const CSS = `
      .dsah-root { box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; height: 100%; min-height: 0; padding: 22px 26px 26px; color: var(--dsw-alias-label-primary); }
      .dsah-head { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
      .dsah-head-main { flex: 1 1 320px; min-width: 0; }
      .dsah-title { margin: 0; font-size: 18px; font-weight: 650; letter-spacing: .01em; }
      .dsah-subtitle { margin: 6px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--dsw-alias-label-secondary); max-width: 72ch; }
      .dsah-head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .dsah-btn { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 7px 12px; font-size: 12.5px; line-height: 1.2; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; }
      .dsah-btn:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
      .dsah-btn:disabled { opacity: .5; cursor: not-allowed; }
      .dsah-btn-primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #fff; }
      .dsah-btn-primary:hover { filter: brightness(1.06); background: var(--dsw-alias-brand-primary); }
      .dsah-btn-danger { color: var(--dsw-alias-state-error-primary); }
      .dsah-btn-quiet { background: transparent; border-color: transparent; color: var(--dsw-alias-label-secondary); }
      .dsah-btn-quiet:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
      .dsah-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .dsah-search { flex: 1 1 240px; min-width: 180px; position: relative; }
      .dsah-search input, .dsah-input, .dsah-select, .dsah-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 13px; padding: 8px 10px; outline: none; }
      .dsah-search input:focus, .dsah-input:focus, .dsah-select:focus, .dsah-textarea:focus { border-color: var(--dsw-alias-brand-primary); }
      .dsah-search input { padding-left: 30px; }
      .dsah-search-mark { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--dsw-alias-label-secondary); pointer-events: none; display: flex; }
      .dsah-chips { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
      .dsah-chip { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary); border-radius: 999px; padding: 4px 10px; font-size: 12px; cursor: pointer; font-family: inherit; }
      .dsah-chip:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
      .dsah-chip[data-active="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
      .dsah-count { font-size: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
      .dsah-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px; }
      .dsah-card { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 10px; padding: 12px 14px; display: flex; gap: 14px; align-items: flex-start; }
      .dsah-card:hover { border-color: var(--dsw-alias-border-l2); }
      .dsah-card-body { flex: 1 1 auto; min-width: 0; }
      .dsah-card-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .dsah-name { font-size: 14px; font-weight: 600; word-break: break-word; }
      .dsah-badge { font-size: 11px; line-height: 1; padding: 4px 7px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l1); white-space: nowrap; }
      .dsah-badge-accent { color: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); background: transparent; }
      .dsah-desc { margin: 6px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); word-break: break-word; }
      .dsah-preview { margin: 8px 0 0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-base); border: 1px dashed var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px 10px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-wrap; word-break: break-word; }
      .dsah-card-actions { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; justify-content: flex-end; flex: 0 0 auto; max-width: 260px; }
      .dsah-empty { flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border: 1px dashed var(--dsw-alias-border-l1); border-radius: 12px; padding: 46px 24px; text-align: center; color: var(--dsw-alias-label-secondary); }
      .dsah-empty-title { font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); }
      .dsah-empty-copy { font-size: 12.5px; line-height: 1.7; max-width: 60ch; }
      .dsah-notice { font-size: 12.5px; line-height: 1.6; border-radius: 8px; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); }
      .dsah-notice[data-kind="error"] { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
      .dsah-notice[data-kind="ok"] { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
      .dsah-modal-backdrop { position: fixed; inset: 0; background: rgba(8, 10, 14, .55); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 60; }
      .dsah-modal { width: min(720px, 100%); max-height: min(84vh, 900px); display: flex; flex-direction: column; background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 14px; box-shadow: 0 24px 64px rgba(0,0,0,.42); overflow: hidden; }
      .dsah-modal-head { padding: 16px 20px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); display: flex; align-items: center; gap: 10px; }
      .dsah-modal-title { margin: 0; font-size: 15px; font-weight: 650; flex: 1 1 auto; }
      .dsah-modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
      .dsah-modal-foot { padding: 12px 20px 16px; border-top: 1px solid var(--dsw-alias-border-l1); display: flex; justify-content: flex-end; gap: 8px; align-items: center; }
      .dsah-field { display: flex; flex-direction: column; gap: 6px; }
      .dsah-field-label { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
      .dsah-field-hint { font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
      .dsah-field-row { display: flex; gap: 12px; flex-wrap: wrap; }
      .dsah-field-row > .dsah-field { flex: 1 1 220px; min-width: 160px; }
      .dsah-textarea { resize: vertical; min-height: 150px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12.5px; line-height: 1.6; }
      .dsah-radio-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
      .dsah-radio-row label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; }
      .dsah-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .dsah-tab { appearance: none; background: transparent; border: 0; border-bottom: 2px solid transparent; color: var(--dsw-alias-label-secondary); font-family: inherit; font-size: 13px; padding: 8px 10px; cursor: pointer; }
      .dsah-tab[data-active="true"] { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-brand-primary); }
      .dsah-skill-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
      .dsah-skill { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px 10px; display: flex; gap: 10px; align-items: center; }
      .dsah-skill-main { flex: 1 1 auto; min-width: 0; }
      .dsah-skill-name { font-size: 13px; font-weight: 600; }
      .dsah-skill-desc { font-size: 11.5px; color: var(--dsw-alias-label-secondary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsah-hidden { display: none; }
      .dsah-launch { position: relative; display: inline-flex; }
      .dsah-launch-btn { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary); border-radius: 999px; padding: 3px 10px; font-size: 11.5px; line-height: 1.6; display: inline-flex; gap: 6px; align-items: center; cursor: pointer; font-family: inherit; }
      .dsah-launch-btn:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); }
      .dsah-launch-btn[data-open="true"] { color: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); }
      .dsah-pop { position: fixed; z-index: 70; width: min(460px, calc(100vw - 24px)); max-height: min(62vh, 560px); display: flex; flex-direction: column; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; box-shadow: 0 18px 48px rgba(0,0,0,.45); overflow: hidden; }
      .dsah-pop-head { padding: 10px 12px 8px; border-bottom: 1px solid var(--dsw-alias-border-l1); display: flex; flex-direction: column; gap: 8px; }
      .dsah-pop-title-row { display: flex; align-items: center; gap: 8px; }
      .dsah-pop-title { font-size: 12.5px; font-weight: 650; flex: 1 1 auto; }
      .dsah-pop-head .dsah-search { flex: none; }
      .dsah-pop-args { padding: 8px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .dsah-pop-list { overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
      .dsah-item { appearance: none; border: 1px solid transparent; background: transparent; border-radius: 8px; padding: 8px 10px; text-align: left; cursor: pointer; font-family: inherit; color: var(--dsw-alias-label-primary); display: flex; flex-direction: column; gap: 3px; }
      .dsah-item:hover, .dsah-item[data-active="true"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l1); }
      .dsah-item-top { display: flex; align-items: center; gap: 8px; }
      .dsah-item-name { font-size: 13px; font-weight: 600; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsah-item-desc { font-size: 11.5px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dsah-pop-foot { border-top: 1px solid var(--dsw-alias-border-l1); padding: 8px 10px; display: flex; gap: 8px; align-items: center; }
      .dsah-pop-hint { font-size: 11px; color: var(--dsw-alias-label-secondary); flex: 1 1 auto; }
    `;

    const TEXT = {
      zh: {
        'panel.title': 'Actions',
        'panel.subtitle': '把常用的提示词和流程存成 Action：不占上下文、不会自动触发，需要时从收藏夹里取用。',
        'panel.new': '新建 Action',
        'panel.import': '导入',
        'panel.export': '导出',
        'panel.refresh': '刷新',
        'panel.search': '搜索名称、描述、分类、标签或正文…',
        'panel.all': '全部',
        'panel.uncategorized': '未分类',
        'panel.count': '共 {count} 个 Action',
        'panel.countFiltered': '匹配 {count} / {total}',
        'panel.emptyTitle': '收藏夹还是空的',
        'panel.emptyCopy': '把经常重复输入的提示词存成 Action。之后只需要在输入框下方点一下，正文就会插入当前输入框，按 Enter 发送即可。',
        'panel.emptyFiltered': '没有匹配的 Action，换个关键词或分类试试。',
        'panel.openComposer': '在任意会话的输入框下方使用「Actions」按钮调用；这里负责管理。',
        'panel.copy': '复制',
        'panel.edit': '编辑',
        'panel.duplicate': '复制一份',
        'panel.delete': '删除',
        'panel.copied': '提示词已复制到剪贴板',
        'panel.copyFailed': '复制失败，请手动选择正文复制',
        'panel.saved': '已保存',
        'panel.deleted': '已删除',
        'panel.duplicated': '已创建副本',
        'panel.tags': '标签',
        'panel.updated': '更新于 {time}',
        'panel.used': '用过 {count} 次',
        'panel.editorCreate': '新建 Action',
        'panel.editorEdit': '编辑 Action',
        'panel.fieldName': '名称',
        'panel.fieldNameHint': '在收藏夹里显示的名字，例如「代码审查」。',
        'panel.fieldCategory': '分类',
        'panel.fieldCategoryHint': '自由填写；已有分类会作为候选提示。',
        'panel.fieldTags': '标签',
        'panel.fieldTagsHint': '用逗号分隔，方便搜索，例如 git, commit。',
        'panel.fieldArgs': '参数提示',
        'panel.fieldArgsHint': '正文里的 {{args}} 会被替换成调用时填写的参数；留空表示没有参数。',
        'panel.fieldDescription': '描述',
        'panel.fieldDescriptionHint': '一句话说明它做什么，搜索时会用到。',
        'panel.fieldPrompt': '提示词正文',
        'panel.fieldPromptHint': '可以写多段 Markdown。{{args}} 是参数占位符，{{date}} 是当天日期。',
        'panel.save': '保存',
        'panel.cancel': '取消',
        'panel.deleteTitle': '删除这个 Action？',
        'panel.deleteCopy': '「{name}」将从收藏夹移除，此操作不可撤销。',
        'panel.deleteConfirm': '确认删除',
        'panel.importTitle': '导入 Actions',
        'panel.importPaste': '粘贴 JSON',
        'panel.importSkill': '从 Skill 导入',
        'panel.importJsonHint': '粘贴本插件导出的 JSON，或选择文件。',
        'panel.importMode': '导入方式',
        'panel.importMerge': '合并（同 id 覆盖）',
        'panel.importReplace': '替换全部',
        'panel.importChooseFile': '选择文件…',
        'panel.importRun': '开始导入',
        'panel.imported': '导入完成：新增 {added}，更新 {updated}',
        'panel.importInvalid': '无法解析这份 JSON',
        'panel.skillCwd': '项目目录（可选）',
        'panel.skillCwdHint': '留空使用当前 Profile 的默认目录；项目级 skill 需要填项目根目录。',
        'panel.skillLoad': '读取 Skills',
        'panel.skillEmpty': '没有找到 Skill。检查目录是否正确。',
        'panel.skillImport': '导入为 Action',
        'panel.skillImported': '已从 Skill 导入：{name}',
        'panel.skillUnavailable': '当前 Profile 未启用 Skills 服务',
        'panel.categoryManage': '管理分类',
        'panel.categoryTitle': '分类管理',
        'panel.categoryRename': '重命名',
        'panel.categoryDelete': '删除分类',
        'panel.categoryDeleteCopy': '分类里的 Action 会移到「未分类」。',
        'panel.loading': '加载中…',
        'panel.loadFailed': '读取 Actions 失败：{error}',
        'panel.retry': '重试',
        'panel.catEmpty': '没有分类',
        'panel.renameCategoryTitle': '重命名分类',
        'panel.newCategoryName': '新名称',
        'launcher.label': 'Actions',
        'launcher.title': '选择一个 Action',
        'launcher.search': '搜索 Action…',
        'launcher.args': '参数（可选，会替换正文里的 {{args}}）',
        'launcher.empty': '还没有 Action。到 Actions 面板新建一个。',
        'launcher.noMatch': '没有匹配项',
        'launcher.manage': '管理 Actions',
        'launcher.hint': '点击插入到输入框',
        'launcher.inserted': '已插入输入框，按 Enter 发送',
        'launcher.insertFailed': '这个会话暂时无法写入输入框',
        'launcher.insertAndSend': '插入并发送',
        'launcher.loadFailed': '读取 Actions 失败',
        'launcher.shortcut': '快捷调用',
      },
      en: {
        'panel.title': 'Actions',
        'panel.subtitle': 'Keep reusable prompts and flows as Actions: no context cost, no automatic trigger — take one from the shelf when you need it.',
        'panel.new': 'New Action',
        'panel.import': 'Import',
        'panel.export': 'Export',
        'panel.refresh': 'Refresh',
        'panel.search': 'Search name, description, category, tag, or body…',
        'panel.all': 'All',
        'panel.uncategorized': 'Uncategorized',
        'panel.count': '{count} Actions',
        'panel.countFiltered': '{count} of {total} match',
        'panel.emptyTitle': 'Your shelf is empty',
        'panel.emptyCopy': 'Save the prompts you keep retyping. Later, one click below the composer inserts the text into the composer; press Enter to send it.',
        'panel.emptyFiltered': 'No Action matches. Try another keyword or category.',
        'panel.openComposer': 'Call them with the “Actions” button under any composer; this page manages them.',
        'panel.copy': 'Copy',
        'panel.edit': 'Edit',
        'panel.duplicate': 'Duplicate',
        'panel.delete': 'Delete',
        'panel.copied': 'Prompt copied to the clipboard',
        'panel.copyFailed': 'Copy failed; select the body and copy manually',
        'panel.saved': 'Saved',
        'panel.deleted': 'Deleted',
        'panel.duplicated': 'Duplicate created',
        'panel.tags': 'Tags',
        'panel.updated': 'Updated {time}',
        'panel.used': 'Used {count}×',
        'panel.editorCreate': 'New Action',
        'panel.editorEdit': 'Edit Action',
        'panel.fieldName': 'Name',
        'panel.fieldNameHint': 'Shown in the shelf, e.g. “Code review”.',
        'panel.fieldCategory': 'Category',
        'panel.fieldCategoryHint': 'Free text; existing categories are suggested.',
        'panel.fieldTags': 'Tags',
        'panel.fieldTagsHint': 'Comma separated, e.g. git, commit.',
        'panel.fieldArgs': 'Argument hint',
        'panel.fieldArgsHint': '{{args}} in the body is replaced by the value typed at call time; empty means no argument.',
        'panel.fieldDescription': 'Description',
        'panel.fieldDescriptionHint': 'One line on what it does; also searched.',
        'panel.fieldPrompt': 'Prompt body',
        'panel.fieldPromptHint': 'Markdown is fine. {{args}} is the argument slot; {{date}} is today.',
        'panel.save': 'Save',
        'panel.cancel': 'Cancel',
        'panel.deleteTitle': 'Delete this Action?',
        'panel.deleteCopy': '“{name}” leaves the shelf permanently.',
        'panel.deleteConfirm': 'Delete',
        'panel.importTitle': 'Import Actions',
        'panel.importPaste': 'Paste JSON',
        'panel.importSkill': 'From Skill',
        'panel.importJsonHint': 'Paste JSON exported by this plugin, or choose a file.',
        'panel.importMode': 'Import mode',
        'panel.importMerge': 'Merge (same id overwrites)',
        'panel.importReplace': 'Replace all',
        'panel.importChooseFile': 'Choose file…',
        'panel.importRun': 'Import',
        'panel.imported': 'Imported: {added} added, {updated} updated',
        'panel.importInvalid': 'That JSON could not be parsed',
        'panel.skillCwd': 'Project directory (optional)',
        'panel.skillCwdHint': 'Empty uses the profile default; project-level skills need the project root.',
        'panel.skillLoad': 'Load Skills',
        'panel.skillEmpty': 'No Skills found. Check the directory.',
        'panel.skillImport': 'Import as Action',
        'panel.skillImported': 'Imported from Skill: {name}',
        'panel.skillUnavailable': 'The Skills service is not enabled in this profile',
        'panel.categoryManage': 'Categories',
        'panel.categoryTitle': 'Categories',
        'panel.categoryRename': 'Rename',
        'panel.categoryDelete': 'Delete category',
        'panel.categoryDeleteCopy': 'Its Actions move to Uncategorized.',
        'panel.loading': 'Loading…',
        'panel.loadFailed': 'Could not load Actions: {error}',
        'panel.retry': 'Retry',
        'panel.catEmpty': 'No categories',
        'panel.renameCategoryTitle': 'Rename category',
        'panel.newCategoryName': 'New name',
        'launcher.label': 'Actions',
        'launcher.title': 'Pick an Action',
        'launcher.search': 'Search Actions…',
        'launcher.args': 'Arguments (optional; replaces {{args}})',
        'launcher.empty': 'No Actions yet. Create one on the Actions page.',
        'launcher.noMatch': 'No match',
        'launcher.manage': 'Manage Actions',
        'launcher.hint': 'Click to insert into the composer',
        'launcher.inserted': 'Inserted; press Enter to send',
        'launcher.insertFailed': 'This session cannot be written to right now',
        'launcher.insertAndSend': 'Insert and send',
        'launcher.loadFailed': 'Could not load Actions',
        'launcher.shortcut': 'Quick call',
      },
    };

    // ---------------------------------------------------------------- helpers

    /**
     * @param {object} props - slot props carrying the bound translator.
     * @returns {(key: string, params?: object) => string}
     */
    function translate(props) {
      if (typeof props?.t === 'function') return props.t;
      return (key) => (TEXT.zh[key] ?? key);
    }

    /**
     * Fetch one API route and normalize failures into an Error with a usable
     * message (the Host answers `{ ok: false, error }`).
     *
     * @param {string} route
     * @param {object} [body]
     * @returns {Promise<any>}
     */
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
        const reason = payload?.error ?? `HTTP ${response.status}`;
        throw new Error(reason);
      }
      return payload;
    }

    /**
     * @param {unknown} error
     * @returns {string}
     */
    function describeError(error) {
      return error instanceof Error ? error.message : String(error);
    }

    /**
     * Shared collection state for every UI surface. One instance per plugin
     * apply, so a save on the page is visible to the launcher immediately.
     */
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
        if (snapshot.status === 'idle' || snapshot.status === 'error') {
          set({ ...snapshot, status: 'loading', error: '' });
        }
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
        if (Array.isArray(data.actions)) {
          set({ ...snapshot, status: 'ready', actions: data.actions, error: '' });
        } else {
          void refresh(true).catch(() => {});
        }
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
        dispose() {
          listeners.clear();
        },
      };
    }

    /**
     * @param {ReturnType<typeof createHub>} hub
     * @returns {{ snapshot: object }}
     */
    function useHub(hub) {
      const [snapshot, setSnapshot] = React.useState(() => hub.get());
      React.useEffect(() => hub.subscribe(setSnapshot), [hub]);
      React.useEffect(() => {
        if (hub.get().status === 'idle') void hub.refresh().catch(() => {});
      }, [hub]);
      return { snapshot };
    }

    /**
     * Append a prompt to the current draft instead of overwriting what the user
     * already typed.
     *
     * @param {string} draft
     * @param {string} prompt
     * @returns {string}
     */
    function composeDraft(draft, prompt) {
      const current = typeof draft === 'string' ? draft.replace(/\s+$/, '') : '';
      const next = typeof prompt === 'string' ? prompt : '';
      if (current === '') return next;
      if (next === '') return current;
      return `${current}\n\n${next}`;
    }

    /**
     * Fill `{{args}}`/`$ARGUMENTS`/`{{date}}` placeholders; append a bare
     * argument when the body has no slot for it.
     *
     * @param {string} prompt
     * @param {{ args?: string, date?: Date }} [context]
     * @returns {string}
     */
    function expandPrompt(prompt, context = {}) {
      const text = typeof prompt === 'string' ? prompt : '';
      const args = typeof context.args === 'string' ? context.args.trim() : '';
      const now = context.date instanceof Date ? context.date : new Date();
      const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      const hasSlot = ARG_TOKENS.some((token) => text.includes(token));
      let expanded = text;
      for (const token of ARG_TOKENS) expanded = expanded.split(token).join(args);
      expanded = expanded.split('{{date}}').join(date).split('{{DATE}}').join(date);
      if (args !== '' && !hasSlot) expanded = `${expanded}\n\n${args}`;
      return expanded.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trimEnd();
    }

    /**
     * Case-insensitive multi-word match over the searchable fields.
     * @param {object} action
     * @param {string} query
     * @returns {boolean}
     */
    function matches(action, query) {
      const needle = typeof query === 'string' ? query.trim().toLowerCase() : '';
      if (needle === '') return true;
      const haystack = [
        action?.name,
        action?.description,
        action?.category,
        Array.isArray(action?.tags) ? action.tags.join(' ') : '',
        action?.prompt,
      ].filter((part) => typeof part === 'string').join('\n').toLowerCase();
      return needle.split(/\s+/).every((part) => haystack.includes(part));
    }

    /**
     * Recently used first, then category, then name.
     * @param {readonly object[]} actions
     * @returns {object[]}
     */
    function sortActions(actions) {
      return [...actions].sort((left, right) => {
        const usedLeft = left.usage?.lastAt ?? 0;
        const usedRight = right.usage?.lastAt ?? 0;
        if (usedLeft !== usedRight) return usedRight - usedLeft;
        const category = (left.category || '').localeCompare(right.category || '', 'zh-CN');
        if (category !== 0) return category;
        return (left.name || '').localeCompare(right.name || '', 'zh-CN');
      });
    }

    /**
     * @param {number} timestamp
     * @returns {string}
     */
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

    /**
     * @param {string} text
     * @returns {Promise<void>}
     */
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        /* fall back to a hidden textarea */
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

    /**
     * Read one Action's prompt with argument expansion, refusing an empty body.
     * @param {object} action
     * @param {string} args
     * @returns {string}
     */
    function promptOf(action, args) {
      return expandPrompt(action?.prompt ?? '', { args });
    }

    // ------------------------------------------------------------- primitives

    /**
     * @param {{ children?: any, onClick?: Function, disabled?: boolean, primary?: boolean, danger?: boolean, quiet?: boolean, title?: string, type?: string }} props
     */
    function Button(props) {
      const classes = ['dsah-btn'];
      if (props.primary) classes.push('dsah-btn-primary');
      if (props.danger) classes.push('dsah-btn-danger');
      if (props.quiet) classes.push('dsah-btn-quiet');
      return h('button', {
        type: props.type ?? 'button',
        className: classes.join(' '),
        onClick: props.onClick,
        disabled: props.disabled === true,
        title: props.title,
      }, props.children);
    }

    /**
     * @param {{ children?: any }} props
     */
    function IconSearch() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, fill: 'none' },
        h('circle', { cx: 7, cy: 7, r: 4.6, stroke: 'currentColor', strokeWidth: 1.4 }),
        h('path', { d: 'M10.5 10.5 14 14', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }));
    }

    /**
     * @param {{ children?: any }} props
     */
    function IconClose() {
      return h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, 'aria-hidden': true, fill: 'none' },
        h('path', { d: 'M4 4l8 8M12 4l-8 8', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }));
    }

    /**
     * A modal dialog with backdrop click, Escape handling, and focus restore.
     * @param {{ title: string, onClose: Function, children?: any, footer?: any, wide?: boolean, t: Function }} props
     */
    function Modal(props) {
      const t = props.t;
      const panelRef = React.useRef(null);
      const closeRef = React.useRef(props.onClose);
      closeRef.current = props.onClose;
      React.useEffect(() => {
        const previous = document.activeElement;
        const focusable = panelRef.current?.querySelector('input, textarea, select')
          ?? panelRef.current?.querySelector('button');
        if (focusable instanceof HTMLElement) focusable.focus();
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            closeRef.current();
          }
        };
        document.addEventListener('keydown', onKey, true);
        return () => {
          document.removeEventListener('keydown', onKey, true);
          if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
        };
      }, []);
      return h('div', { className: 'dsah-modal-backdrop', onMouseDown: (event) => { if (event.target === event.currentTarget) props.onClose(); } },
        h('div', { className: 'dsah-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title, ref: panelRef },
          h('div', { className: 'dsah-modal-head' },
            h('h2', { className: 'dsah-modal-title' }, props.title),
            h(Button, { quiet: true, onClick: props.onClose, title: t('panel.cancel') }, h(IconClose))),
          h('div', { className: 'dsah-modal-body' }, props.children),
          props.footer === undefined ? null : h('div', { className: 'dsah-modal-foot' }, props.footer)));
    }

    // ------------------------------------------------------------ management

    /**
     * One row in the management list.
     * @param {{ action: object, t: Function, onEdit: Function, onDelete: Function, onDuplicate: Function, notify: Function }} props
     */
    function ActionCard(props) {
      const { action, t } = props;
      const used = action.usage?.count ?? 0;
      return h('div', { className: 'dsah-card' },
        h('div', { className: 'dsah-card-body' },
          h('div', { className: 'dsah-card-head' },
            h('span', { className: 'dsah-name' }, action.name),
            action.category ? h('span', { className: 'dsah-badge dsah-badge-accent' }, action.category) : null,
            action.source?.kind === 'skill' ? h('span', { className: 'dsah-badge' }, 'Skill') : null,
            (action.tags ?? []).map((tag) => h('span', { key: tag, className: 'dsah-badge' }, `#${tag}`)),
            used > 0 ? h('span', { className: 'dsah-badge' }, t('panel.used', { count: used })) : null),
          action.description ? h('p', { className: 'dsah-desc' }, action.description) : null,
          h('pre', { className: 'dsah-preview' }, action.prompt),
          h('p', { className: 'dsah-desc' }, t('panel.updated', { time: relativeTime(action.updatedAt) }))),
        h('div', { className: 'dsah-card-actions' },
          h(Button, {
            onClick: async () => {
              try {
                await copyText(action.prompt);
                props.notify(t('panel.copied'), 'ok');
              } catch {
                props.notify(t('panel.copyFailed'), 'error');
              }
            },
          }, t('panel.copy')),
          h(Button, { onClick: () => props.onEdit(action) }, t('panel.edit')),
          h(Button, { onClick: () => props.onDuplicate(action) }, t('panel.duplicate')),
          h(Button, { danger: true, onClick: () => props.onDelete(action) }, t('panel.delete'))));
    }

    /**
     * Create/edit form. All validation is local; the Host validates again.
     * @param {{ initial: object | null, categories: string[], t: Function, onSave: Function, onClose: Function }} props
     */
    function EditorDialog(props) {
      const { t } = props;
      const initial = props.initial;
      const [form, setForm] = React.useState(() => ({
        name: initial?.name ?? '',
        category: initial?.category ?? '',
        tags: Array.isArray(initial?.tags) ? initial.tags.join(', ') : '',
        argsHint: initial?.argsHint ?? '',
        description: initial?.description ?? '',
        prompt: initial?.prompt ?? '',
      }));
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const patch = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

      const save = async () => {
        if (form.name.trim() === '') {
          setError(t('panel.fieldName'));
          return;
        }
        if (form.prompt.trim() === '') {
          setError(t('panel.fieldPrompt'));
          return;
        }
        setBusy(true);
        try {
          await props.onSave({
            name: form.name.trim(),
            category: form.category.trim(),
            tags: form.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag !== ''),
            argsHint: form.argsHint.trim(),
            description: form.description.trim(),
            prompt: form.prompt,
          });
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      return h(Modal, {
        title: initial === null ? t('panel.editorCreate') : t('panel.editorEdit'),
        t,
        onClose: props.onClose,
        footer: h(React.Fragment, null,
          h(Button, { onClick: props.onClose }, t('panel.cancel')),
          h(Button, { primary: true, disabled: busy, onClick: save }, t('panel.save'))),
      },
      h('div', { className: 'dsah-field' },
        h('label', { className: 'dsah-field-label' }, t('panel.fieldName')),
        h('input', {
          className: 'dsah-input',
          value: form.name,
          maxLength: 80,
          placeholder: '例如：代码审查',
          onChange: patch('name'),
          'aria-label': t('panel.fieldName'),
        }),
        h('span', { className: 'dsah-field-hint' }, t('panel.fieldNameHint'))),
      h('div', { className: 'dsah-field-row' },
        h('div', { className: 'dsah-field' },
          h('label', { className: 'dsah-field-label' }, t('panel.fieldCategory')),
          h('input', {
            className: 'dsah-input',
            value: form.category,
            maxLength: 40,
            list: 'dsah-categories',
            placeholder: '开发 / 效率 / …',
            onChange: patch('category'),
            'aria-label': t('panel.fieldCategory'),
          }),
          h('datalist', { id: 'dsah-categories' }, (props.categories ?? []).map((name) => h('option', { key: name, value: name }))),
          h('span', { className: 'dsah-field-hint' }, t('panel.fieldCategoryHint'))),
        h('div', { className: 'dsah-field' },
          h('label', { className: 'dsah-field-label' }, t('panel.fieldTags')),
          h('input', {
            className: 'dsah-input',
            value: form.tags,
            placeholder: 'git, commit',
            onChange: patch('tags'),
            'aria-label': t('panel.fieldTags'),
          }),
          h('span', { className: 'dsah-field-hint' }, t('panel.fieldTagsHint')))),
      h('div', { className: 'dsah-field-row' },
        h('div', { className: 'dsah-field' },
          h('label', { className: 'dsah-field-label' }, t('panel.fieldDescription')),
          h('input', {
            className: 'dsah-input',
            value: form.description,
            maxLength: 600,
            placeholder: '一句话说明这个 Action 做什么',
            onChange: patch('description'),
            'aria-label': t('panel.fieldDescription'),
          })),
        h('div', { className: 'dsah-field' },
          h('label', { className: 'dsah-field-label' }, t('panel.fieldArgs')),
          h('input', {
            className: 'dsah-input',
            value: form.argsHint,
            maxLength: 120,
            placeholder: '例如：分支名',
            onChange: patch('argsHint'),
            'aria-label': t('panel.fieldArgs'),
          }))),
      h('div', { className: 'dsah-field' },
        h('label', { className: 'dsah-field-label' }, t('panel.fieldPrompt')),
        h('textarea', {
          className: 'dsah-textarea',
          value: form.prompt,
          rows: 12,
          spellCheck: false,
          placeholder: '把要发给 Agent 的提示词写在这里…',
          onChange: patch('prompt'),
          'aria-label': t('panel.fieldPrompt'),
        }),
        h('span', { className: 'dsah-field-hint' }, t('panel.fieldPromptHint'))),
      error === '' ? null : h('div', { className: 'dsah-notice', 'data-kind': 'error', role: 'alert' }, error));
    }

    /**
     * Import dialog with a JSON tab and a Skill tab.
     * @param {{ t: Function, onClose: Function, onDone: Function, notify: Function, categories: string[] }} props
     */
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
          setError(t('panel.importInvalid'));
          return;
        }
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.actions) ? parsed.actions : null;
        if (list === null) {
          setError(t('panel.importInvalid'));
          return;
        }
        setBusy(true);
        try {
          const data = await api('/import', { actions: list, mode });
          props.notify(t('panel.imported', { added: data.added, updated: data.updated }), 'ok');
          props.onDone(data.actions);
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
          if (data.unavailable) setSkillError(t('panel.skillUnavailable'));
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
          const data = await api('/import-skill', { name: skill.name, cwd: cwd.trim() === '' ? undefined : cwd.trim() });
          props.notify(t('panel.skillImported', { name: skill.name }), 'ok');
          props.onDone(data.actions);
        } catch (failure) {
          setSkillError(describeError(failure));
        } finally {
          setSkillBusy(false);
        }
      };

      return h(Modal, {
        title: t('panel.importTitle'),
        t,
        onClose: props.onClose,
        footer: tab === 'json'
          ? h(React.Fragment, null,
            h(Button, { onClick: props.onClose }, t('panel.cancel')),
            h(Button, { primary: true, disabled: busy || text.trim() === '', onClick: runImport }, t('panel.importRun')))
          : h(Button, { onClick: props.onClose }, t('panel.cancel')),
      },
      h('div', { className: 'dsah-tabs' },
        h('button', { type: 'button', className: 'dsah-tab', 'data-active': tab === 'json', onClick: () => setTab('json') }, t('panel.importPaste')),
        h('button', { type: 'button', className: 'dsah-tab', 'data-active': tab === 'skill', onClick: () => setTab('skill') }, t('panel.importSkill'))),
      tab === 'json'
        ? h(React.Fragment, null,
          h('p', { className: 'dsah-field-hint' }, t('panel.importJsonHint')),
          h('textarea', {
            className: 'dsah-textarea',
            value: text,
            rows: 10,
            spellCheck: false,
            placeholder: '{ "actions": [ … ] }',
            onChange: (event) => setText(event.target.value),
            'aria-label': t('panel.importPaste'),
          }),
          h('div', { className: 'dsah-radio-row' },
            h('span', null, `${t('panel.importMode')}：`),
            h('label', null, h('input', { type: 'radio', name: 'dsah-import-mode', checked: mode === 'merge', onChange: () => setMode('merge') }), t('panel.importMerge')),
            h('label', null, h('input', { type: 'radio', name: 'dsah-import-mode', checked: mode === 'replace', onChange: () => setMode('replace') }), t('panel.importReplace'))),
          h('div', null,
            h('input', {
              ref: fileRef,
              type: 'file',
              accept: '.json,application/json',
              className: 'dsah-hidden',
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
            h(Button, { onClick: () => fileRef.current?.click() }, t('panel.importChooseFile'))))
        : h(React.Fragment, null,
          h('div', { className: 'dsah-field' },
            h('label', { className: 'dsah-field-label' }, t('panel.skillCwd')),
            h('input', {
              className: 'dsah-input',
              value: cwd,
              placeholder: 'C:\\path\\to\\project',
              onChange: (event) => setCwd(event.target.value),
              'aria-label': t('panel.skillCwd'),
            }),
            h('span', { className: 'dsah-field-hint' }, t('panel.skillCwdHint'))),
          h('div', null, h(Button, { disabled: skillBusy, onClick: loadSkills }, t('panel.skillLoad'))),
          skills === null
            ? null
            : skills.length === 0
              ? h('div', { className: 'dsah-notice' }, t('panel.skillEmpty'))
              : h('div', { className: 'dsah-skill-list' }, skills.map((skill) => h('div', { key: skill.name, className: 'dsah-skill' },
                h('div', { className: 'dsah-skill-main' },
                  h('div', { className: 'dsah-skill-name' }, skill.name),
                  h('div', { className: 'dsah-skill-desc', title: skill.description }, skill.description || '')),
                h(Button, { disabled: skillBusy, onClick: () => importSkill(skill) }, t('panel.skillImport')))))),
      error === '' ? null : h('div', { className: 'dsah-notice', 'data-kind': 'error', role: 'alert' }, error),
      skillError === '' ? null : h('div', { className: 'dsah-notice', 'data-kind': 'error', role: 'alert' }, skillError));
    }

    /**
     * Rename/delete categories in place.
     * @param {{ t: Function, categories: string[], onClose: Function, onDone: Function, notify: Function }} props
     */
    function CategoryDialog(props) {
      const { t } = props;
      const [renaming, setRenaming] = React.useState(null);
      const [draft, setDraft] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');

      const submitRename = async () => {
        if (renaming === null || draft.trim() === '' || draft.trim() === renaming) {
          setRenaming(null);
          return;
        }
        setBusy(true);
        try {
          const data = await api('/category/rename', { from: renaming, to: draft.trim() });
          props.onDone(data.actions);
          props.notify(t('panel.saved'), 'ok');
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
          const data = await api('/category/delete', { name });
          props.onDone(data.actions);
          props.notify(t('panel.deleted'), 'ok');
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      return h(Modal, { title: t('panel.categoryTitle'), t, onClose: props.onClose, footer: h(Button, { onClick: props.onClose }, t('panel.cancel')) },
        props.categories.length === 0
          ? h('div', { className: 'dsah-notice' }, t('panel.catEmpty'))
          : h('div', { className: 'dsah-skill-list' }, props.categories.map((name) => h('div', { key: name, className: 'dsah-skill' },
            h('div', { className: 'dsah-skill-main' },
              renaming === name
                ? h('input', {
                  className: 'dsah-input',
                  value: draft,
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown: (event) => { if (event.key === 'Enter') void submitRename(); },
                  autoFocus: true,
                  'aria-label': t('panel.newCategoryName'),
                })
                : h('div', { className: 'dsah-skill-name' }, name)),
            renaming === name
              ? h(React.Fragment, null,
                h(Button, { primary: true, disabled: busy, onClick: submitRename }, t('panel.save')),
                h(Button, { quiet: true, onClick: () => setRenaming(null) }, t('panel.cancel')))
              : h(React.Fragment, null,
                h(Button, { onClick: () => { setRenaming(name); setDraft(name); } }, t('panel.categoryRename')),
                h(Button, { danger: true, disabled: busy, onClick: () => remove(name), title: t('panel.categoryDeleteCopy') }, t('panel.categoryDelete')))))),
        error === '' ? null : h('div', { className: 'dsah-notice', 'data-kind': 'error', role: 'alert' }, error));
    }

    /**
     * The full page. Rendered in the `main` keyed slot.
     */
    function createPage(hub, ctx) {
      return function ActionHubPage(props) {
        const t = translate(props);
        const { snapshot } = useHub(hub);
        const [query, setQuery] = React.useState('');
        const [category, setCategory] = React.useState('');
        const [editing, setEditing] = React.useState(undefined); // undefined = closed, null = create
        const [deleting, setDeleting] = React.useState(null);
        const [importing, setImporting] = React.useState(false);
        const [managingCategories, setManagingCategories] = React.useState(false);
        const [notice, setNotice] = React.useState({ text: '', kind: '' });

        const notify = React.useCallback((text, kind = 'ok') => setNotice({ text, kind }), []);
        React.useEffect(() => {
          if (notice.text === '') return undefined;
          const timer = setTimeout(() => setNotice({ text: '', kind: '' }), 3200);
          return () => clearTimeout(timer);
        }, [notice]);

        const actions = snapshot.actions ?? [];
        const categories = React.useMemo(
          () => [...new Set(actions.map((action) => action.category).filter((name) => typeof name === 'string' && name !== ''))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
          [actions],
        );
        const visible = React.useMemo(
          () => sortActions(actions.filter((action) => (category === '' || (action.category || '') === category) && matches(action, query))),
          [actions, category, query],
        );

        const save = async (form) => {
          if (editing === null) {
            await hub.call('/create', { action: form });
            notify(t('panel.saved'), 'ok');
          } else {
            await hub.call('/update', { id: editing.id, patch: form });
            notify(t('panel.saved'), 'ok');
          }
          setEditing(undefined);
        };

        const remove = async () => {
          if (deleting === null) return;
          try {
            await hub.call('/delete', { id: deleting.id });
            notify(t('panel.deleted'), 'ok');
          } catch (failure) {
            notify(describeError(failure), 'error');
          } finally {
            setDeleting(null);
          }
        };

        const duplicate = async (action) => {
          try {
            await hub.call('/duplicate', { id: action.id });
            notify(t('panel.duplicated'), 'ok');
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
          } catch (failure) {
            notify(describeError(failure), 'error');
          }
        };

        const body = [];
        body.push(h('header', { key: 'head', className: 'dsah-head' },
          h('div', { className: 'dsah-head-main' },
            h('h1', { className: 'dsah-title' }, t('panel.title')),
            h('p', { className: 'dsah-subtitle' }, t('panel.subtitle'))),
          h('div', { className: 'dsah-head-actions' },
            h(Button, { primary: true, onClick: () => setEditing(null) }, t('panel.new')),
            h(Button, { onClick: () => setImporting(true) }, t('panel.import')),
            h(Button, { onClick: exportAll }, t('panel.export')),
            h(Button, { quiet: true, onClick: () => { void hub.refresh(true).catch(() => {}); } }, t('panel.refresh')))));

        body.push(h('div', { key: 'toolbar', className: 'dsah-toolbar' },
          h('div', { className: 'dsah-search' },
            h('span', { className: 'dsah-search-mark' }, h(IconSearch)),
            h('input', {
              value: query,
              placeholder: t('panel.search'),
              onChange: (event) => setQuery(event.target.value),
              'aria-label': t('panel.search'),
            })),
          h('div', { className: 'dsah-chips' },
            h('button', { type: 'button', className: 'dsah-chip', 'data-active': category === '', onClick: () => setCategory('') }, t('panel.all')),
            categories.map((name) => h('button', {
              key: name,
              type: 'button',
              className: 'dsah-chip',
              'data-active': category === name,
              onClick: () => setCategory(category === name ? '' : name),
            }, name)),
            h('button', { type: 'button', className: 'dsah-chip', onClick: () => setManagingCategories(true) }, t('panel.categoryManage'))),
          h('span', { className: 'dsah-count' },
            query === '' && category === ''
              ? t('panel.count', { count: actions.length })
              : t('panel.countFiltered', { count: visible.length, total: actions.length }))));

        if (notice.text !== '') body.push(h('div', { key: 'notice', className: 'dsah-notice', 'data-kind': notice.kind, role: 'status' }, notice.text));

        if (snapshot.status === 'loading' && actions.length === 0) {
          body.push(h('div', { key: 'loading', className: 'dsah-empty' }, h('div', { className: 'dsah-empty-title' }, t('panel.loading'))));
        } else if (snapshot.status === 'error' && actions.length === 0) {
          body.push(h('div', { key: 'error', className: 'dsah-empty' },
            h('div', { className: 'dsah-empty-title' }, t('panel.retry')),
            h('div', { className: 'dsah-empty-copy' }, t('panel.loadFailed', { error: snapshot.error })),
            h(Button, { primary: true, onClick: () => { void hub.refresh(true).catch(() => {}); } }, t('panel.retry'))));
        } else if (visible.length === 0) {
          body.push(h('div', { key: 'empty', className: 'dsah-empty' },
            h('div', { className: 'dsah-empty-title' }, t('panel.emptyTitle')),
            h('div', { className: 'dsah-empty-copy' }, actions.length === 0 ? t('panel.emptyCopy') : t('panel.emptyFiltered')),
            h('div', { className: 'dsah-empty-copy' }, t('panel.openComposer')),
            actions.length === 0
              ? h(Button, { primary: true, onClick: () => setEditing(null) }, t('panel.new'))
              : null));
        } else {
          body.push(h('div', { key: 'list', className: 'dsah-list' }, visible.map((action) => h(ActionCard, {
            key: action.id,
            action,
            t,
            notify,
            onEdit: () => setEditing(action),
            onDuplicate: () => duplicate(action),
            onDelete: () => setDeleting(action),
          }))));
        }

        if (editing !== undefined) {
          body.push(h(EditorDialog, {
            key: 'editor',
            initial: editing,
            categories,
            t,
            onSave: save,
            onClose: () => setEditing(undefined),
          }));
        }
        if (deleting !== null) {
          body.push(h(Modal, {
            key: 'delete',
            title: t('panel.deleteTitle'),
            t,
            onClose: () => setDeleting(null),
            footer: h(React.Fragment, null,
              h(Button, { onClick: () => setDeleting(null) }, t('panel.cancel')),
              h(Button, { danger: true, onClick: remove }, t('panel.deleteConfirm'))),
          }, h('p', { className: 'dsah-desc' }, t('panel.deleteCopy', { name: deleting.name }))));
        }
        if (importing) {
          body.push(h(ImportDialog, {
            key: 'import',
            t,
            notify,
            onClose: () => setImporting(false),
            onDone: () => {
              void hub.refresh(true).catch(() => {});
            },
          }));
        }
        if (managingCategories) {
          body.push(h(CategoryDialog, {
            key: 'categories',
            t,
            categories,
            notify,
            onClose: () => setManagingCategories(false),
            onDone: () => { void hub.refresh(true).catch(() => {}); },
          }));
        }

        return h('div', { className: 'dsah-root' }, body);
      };
    }

    // ---------------------------------------------------------------- launcher

    /**
     * The composer-dock quick launcher. It renders a chip and a fixed popover;
     * picking an Action appends its expanded prompt to the composer draft.
     */
    function createLauncher(hub, ctx) {
      return function ActionLauncher(props) {
        const t = translate(props);
        const { snapshot } = useHub(hub);
        const [open, setOpen] = React.useState(false);
        const [query, setQuery] = React.useState('');
        const [category, setCategory] = React.useState('');
        const [args, setArgs] = React.useState('');
        const [active, setActive] = React.useState(0);
        const [notice, setNotice] = React.useState('');
        const [anchor, setAnchor] = React.useState(null);
        const buttonRef = React.useRef(null);
        const popRef = React.useRef(null);
        const searchRef = React.useRef(null);

        const input = typeof props.useInput === 'function' ? props.useInput((state) => state) : undefined;
        const inputActions = props.inputActions;

        const actions = snapshot.actions ?? [];
        const categories = React.useMemo(
          () => [...new Set(actions.map((action) => action.category).filter((name) => typeof name === 'string' && name !== ''))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
          [actions],
        );
        const visible = React.useMemo(
          () => sortActions(actions.filter((action) => (category === '' || (action.category || '') === category) && matches(action, query))),
          [actions, category, query],
        );

        React.useEffect(() => {
          setActive((index) => (index >= visible.length ? 0 : index));
        }, [visible.length]);

        const close = React.useCallback(() => {
          setOpen(false);
          setArgs('');
          setQuery('');
          setCategory('');
          setNotice('');
        }, []);

        React.useEffect(() => {
          if (!open) return undefined;
          const onPointer = (event) => {
            const target = event.target;
            if (buttonRef.current?.contains(target)) return;
            if (popRef.current?.contains(target)) return;
            close();
          };
          const onKey = (event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          };
          document.addEventListener('mousedown', onPointer, true);
          document.addEventListener('keydown', onKey, true);
          const timer = setTimeout(() => searchRef.current?.focus(), 20);
          return () => {
            document.removeEventListener('mousedown', onPointer, true);
            document.removeEventListener('keydown', onKey, true);
            clearTimeout(timer);
          };
        }, [open, close]);

        const openPopover = () => {
          const rect = buttonRef.current?.getBoundingClientRect();
          setAnchor(rect === undefined ? null : rect);
          setOpen(true);
          setNotice('');
          void hub.refresh().catch(() => {});
        };

        const insert = (action, mode) => {
          if (inputActions === undefined || typeof inputActions.setDraft !== 'function') {
            setNotice(t('launcher.insertFailed'));
            return;
          }
          const prompt = promptOf(action, args);
          const draft = input?.draft ?? '';
          const next = composeDraft(draft, prompt);
          try {
            inputActions.setDraft(next);
          } catch {
            setNotice(t('launcher.insertFailed'));
            return;
          }
          if (mode === 'send') {
            setTimeout(() => {
              try {
                inputActions.submit?.();
              } catch {
                /* the draft is already in place */
              }
            }, 30);
          } else {
            setNotice(t('launcher.inserted'));
          }
          void hub.call('/touch', { id: action.id }).catch(() => {});
          if (mode !== 'send') setTimeout(() => setOpen(false), 700);
        };

        const onSearchKey = (event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, visible.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter') {
            const target = visible[active];
            if (target !== undefined) {
              event.preventDefault();
              insert(target, event.metaKey || event.ctrlKey ? 'send' : 'insert');
            }
          }
        };

        const popover = open
          ? h('div', {
            className: 'dsah-pop',
            ref: popRef,
            role: 'dialog',
            'aria-label': t('launcher.title'),
            style: anchor === null
              ? { left: 16, bottom: 90 }
              : (() => {
                const left = Math.min(Math.max(8, anchor.left), Math.max(8, window.innerWidth - 472));
                const above = anchor.top - 12;
                const below = window.innerHeight - anchor.bottom - 12;
                return above >= 260 || above >= below
                  ? { left, bottom: window.innerHeight - anchor.top + 8, maxHeight: Math.min(560, above) }
                  : { left, top: anchor.bottom + 8, maxHeight: Math.min(560, below) };
              })(),
          },
          h('div', { className: 'dsah-pop-head' },
            h('div', { className: 'dsah-pop-title-row' },
              h('span', { className: 'dsah-pop-title' }, t('launcher.title')),
              h(Button, { quiet: true, onClick: close, title: t('panel.cancel') }, h(IconClose))),
            h('div', { className: 'dsah-search' },
              h('span', { className: 'dsah-search-mark' }, h(IconSearch)),
              h('input', {
                ref: searchRef,
                value: query,
                placeholder: t('launcher.search'),
                onChange: (event) => setQuery(event.target.value),
                onKeyDown: onSearchKey,
                'aria-label': t('launcher.search'),
              }))),
          h('div', { className: 'dsah-pop-args' },
            h('input', {
              className: 'dsah-input',
              value: args,
              placeholder: t('launcher.args'),
              onChange: (event) => setArgs(event.target.value),
              'aria-label': t('launcher.args'),
            })),
          h('div', { className: 'dsah-pop-list' },
            visible.length === 0
              ? h('div', { className: 'dsah-notice' }, actions.length === 0 ? t('launcher.empty') : t('launcher.noMatch'))
              : visible.map((action, index) => h('button', {
                key: action.id,
                type: 'button',
                className: 'dsah-item',
                'data-active': index === active,
                onMouseEnter: () => setActive(index),
                onClick: (event) => insert(action, event.metaKey || event.ctrlKey ? 'send' : 'insert'),
              },
              h('span', { className: 'dsah-item-top' },
                h('span', { className: 'dsah-item-name' }, action.name),
                action.category ? h('span', { className: 'dsah-badge dsah-badge-accent' }, action.category) : null),
              h('span', { className: 'dsah-item-desc' }, action.description || (action.argsHint ? `参数：${action.argsHint}` : ''))))),
          notice === ''
            ? null
            : h('div', { className: 'dsah-pop-args' }, h('div', { className: 'dsah-notice', 'data-kind': 'ok', role: 'status' }, notice)),
          h('div', { className: 'dsah-pop-foot' },
            h('span', { className: 'dsah-pop-hint' }, t('launcher.hint')),
            h(Button, { onClick: () => { close(); ctx.get('layout')?.selectPanel?.(PANEL_ID); } }, t('launcher.manage'))))
          : null;

        const label = `${t('launcher.label')}${actions.length > 0 ? ` · ${actions.length}` : ''}`;
        return h('div', { className: 'dsah-launch' },
          h('button', {
            ref: buttonRef,
            type: 'button',
            className: 'dsah-launch-btn',
            'data-open': open,
            title: t('launcher.shortcut'),
            onClick: () => (open ? close() : openPopover()),
          },
          h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, 'aria-hidden': true, fill: 'none' },
            h('path', { d: 'M2.5 4.2h11M2.5 8h11M2.5 11.8h7', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' })),
          h('span', null, label)),
          popover);
      };
    }

    // ----------------------------------------------------------------- plugin

    /**
     * @param {import('@deepseek-ai/cordis').Context} ctx - plugin Client context.
     */
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
      ctx.effect(() => () => hub.dispose(), 'action-hub: store');

      const Page = createPage(hub, ctx);
      const Launcher = createLauncher(hub, ctx);

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      }, Page));

      const icon = () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 32,
        label: () => t('launcher.label'),
        locale: NS,
      }, PanelIcon(React, h));
      ctx.slots.inject('sidebar.panellist', icon);

      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'action-hub',
        order: 12,
        locale: NS,
      }, Launcher));
    }

    /**
     * Sidebar panel icon: a small shelf/stack mark.
     * @param {object} ReactRuntime
     * @param {Function} create
     * @returns {Function}
     */
    function PanelIcon(ReactRuntime, create) {
      return function ActionHubIcon(props) {
        const size = typeof props?.size === 'number' && props.size > 0 ? props.size : 16;
        return create('svg', {
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          'aria-hidden': true,
          focusable: 'false',
          style: { display: 'block' },
        },
        create('rect', { x: 2.4, y: 2.6, width: 11.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
        create('rect', { x: 2.4, y: 6.5, width: 11.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
        create('rect', { x: 2.4, y: 10.4, width: 7.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }));
      };
    }

    return {
      name: PKG,
      inject: ['slots', 'locale'],
      apply,
      /** Pure helpers, exported so the smoke test can exercise them without a browser. */
      internals: {
        expandPrompt,
        composeDraft,
        matches,
        sortActions,
        relativeTime,
        TEXT,
      },
    };
  },
});
