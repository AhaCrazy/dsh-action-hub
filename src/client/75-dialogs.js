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
              h('span', { className: 'ah-import-badge', 'data-status': item.status }, statusLabel(item.status))),
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
        h('span', { className: 'ah-export-meta' }, action.mode === 'skill' ? t('lib.skill') : t('lib.command'))))),
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
