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
        const [notice, setNotice] = React.useState({ text: '', kind: '' });

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
            h(Button, { onClick: () => setExporting(true) }, h(Icons.download, { size: 13 }), t('action.export')),
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
              detail.builtin === true ? null : h(Button, { onClick: async () => { try { await downloadZip(detail.id); notify(t('lib.exported'), 'ok'); } catch (failure) { notify(describeError(failure), 'error'); } } }, h(Icons.download, { size: 13 }), t('lib.exportOne')),
              detail.builtin === true ? null : h(Button, { onClick: () => { setEditor(detail); setDetail(null); } }, h(Icons.edit, { size: 13 }), t('action.edit')),
              detail.builtin === true ? null : h(Button, { danger: true, onClick: () => setDeleting(detail) }, h(Icons.trash, { size: 13 }), t('action.delete'))),
          },
          h('div', { className: 'ah-preview-meta' },
            detail.builtin === true && detail.category !== '内置' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.builtin')) : null,
            detail.category ? h('span', { className: 'ah-badge ah-badge-accent' }, detail.category) : h('span', { className: 'ah-badge' }, t('lib.uncategorized')),
            detail.pinned ? h('span', { className: 'ah-badge ah-badge-warn' }, t('palette.pinned')) : null,
            detail.source?.kind === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : null,
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

        return h('div', { className: 'ah-page' }, body);
      };
    }
