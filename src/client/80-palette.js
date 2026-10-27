    // --------------------------------------------------------------- palette

    function createPaletteView(hub, palette, prefsRef, shortcutStore) {
      return function ActionPalette(props) {
        const t = translate(props);
        const state = usePalette(palette);
        const snapshot = useHub(hub);
        const sessions = typeof props.useSessions === 'function' ? props.useSessions((value) => value) : undefined;
        const mainSessionId = React.useMemo(() => {
          const byId = sessions?.byId;
          if (byId === null || typeof byId !== 'object') return '';
          const current = Object.values(byId).find((row) => (row?.retainedBy?.mainView ?? 0) > 0);
          return typeof current?.id === 'string' ? current.id : '';
        }, [sessions]);
        const storedSessionId = () => {
          try {
            const raw = localStorage.getItem('dsh.sessions.current');
            if (raw === null) return '';
            const parsed = JSON.parse(raw);
            return typeof parsed?.sessionId === 'string' ? parsed.sessionId : '';
          } catch {
            return '';
          }
        };
        const prefs = usePrefs(prefsRef);
        const shortcutState = useShortcutStore(shortcutStore);
        const searchRef = React.useRef(null);
        const listRef = React.useRef(null);
        const insertRef = React.useRef(null);
        const [selectedId, setSelectedId] = React.useState(null);
        const [args, setArgs] = React.useState('');
        const [sortBy, setSortBy] = React.useState('recent');
        const [regex, setRegex] = React.useState(false);
        const [toast, setToast] = React.useState({ text: '', kind: 'ok' });

        const actions = snapshot.actions ?? [];
        const available = React.useMemo(
          () => actions.filter((action) => action.available !== false),
          [actions],
        );
        const visible = React.useMemo(
          () => visibleActions(available, { query: state.query, sortBy, regex }),
          [available, state.query, regex, sortBy],
        );
        const selected = visible.find((action) => action.id === selectedId) ?? visible[0] ?? null;
        const currentProject = snapshot.currentProject ?? null;
        const groupNames = (selected?.groups ?? [])
          .map((id) => (snapshot.groups ?? []).find((group) => group.id === id)?.name)
          .filter((name) => typeof name === 'string' && name !== '');

        React.useEffect(() => {
          if (mainSessionId !== '') hub.setSession(mainSessionId);
        }, [mainSessionId, hub]);

        React.useEffect(() => {
          if (!state.open) return undefined;
          const composer = document.querySelector('[data-composer-card="true"] [contenteditable="true"]')
            ?? document.querySelector('[contenteditable="true"]');
          setSelectedId(null);
          setArgs('');
          setToast({ text: '', kind: 'ok' });
          const activeSessionId = mainSessionId || storedSessionId() || state.bridge?.sessionId || '';
          if (activeSessionId !== '') hub.setSession(activeSessionId);
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

        React.useEffect(() => {
          if (!state.open) return undefined;
          const onKey = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            close();
          };
          document.addEventListener('keydown', onKey);
          return () => document.removeEventListener('keydown', onKey);
        }, [state.open, close]);

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

        const sortOptions = [
          ['recent', t('lib.sortRecent')],
          ['name', t('lib.sortName')],
          ['created', t('lib.sortCreated')],
          ['week', t('lib.sortWeek')],
          ['month', t('lib.sortMonth')],
          ['total', t('lib.sortTotal')],
        ];

        const header = h('div', { className: 'ah-palette-search' },
          h(SearchField, { inputRef: searchRef, value: state.query, placeholder: t('palette.search'), onChange: (value) => palette.update({ query: value }), onKeyDown: onSearchKey, regex, regexTitle: t('search.regexTitle'), onToggleRegex: () => setRegex((previous) => !previous) }),
          h('select', {
            className: 'ah-palette-sort',
            value: sortBy,
            'aria-label': t('lib.sortLabel'),
            onChange: (event) => setSortBy(event.target.value),
          }, sortOptions.map(([value, label]) => h('option', { key: value, value }, label))),
          h(Kbd, null, 'Esc'));

        const emptyText = actions.length === 0
          ? t('palette.empty')
          : available.length === 0 ? t('palette.noAvailable') : t('palette.noMatch');
        const results = h('div', { className: 'ah-results', ref: listRef, role: 'listbox', 'aria-label': t('palette.title') },
          visible.length === 0
            ? h('div', { className: 'ah-preview-empty' }, h(Icons.shelf, { size: 24 }), emptyText)
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
                action.available === false ? h('span', { className: 'ah-badge' }, t('palette.scopeUnavailable')) : null),
              h('span', { className: 'ah-result-desc' }, action.description || (action.argsHint ? `${action.argsHint}` : action.prompt.slice(0, 80)))))));

        const preview = selected === null
          ? h('div', { className: 'ah-preview' },
            h('div', { className: 'ah-preview-empty' },
              h('div', { className: 'ah-empty-title' }, emptyText),
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
              selected.mode === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : h('span', { className: 'ah-badge' }, t('lib.command')),
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
        bodyContent,
        toastView,
        footer));
      };
    }
