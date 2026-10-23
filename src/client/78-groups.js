    // -------------------------------------------------------- groups & scopes

    function GroupDialog(props) {
      const { t } = props;
      const groups = Array.isArray(props.groups) ? props.groups : [];
      const actions = Array.isArray(props.actions) ? props.actions : [];
      const [name, setName] = React.useState('');
      const [selectedId, setSelectedId] = React.useState(() => groups[0]?.id ?? '');
      const [query, setQuery] = React.useState('');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const active = groups.find((group) => group.id === selectedId) ?? groups[0] ?? null;
      const activeNames = active === null ? [] : actions.filter((action) => (action.groups ?? []).includes(active.id)).map((action) => action.name);
      const filteredActions = query.trim() === ''
        ? actions
        : actions.filter((action) => `${action.name} ${action.description} ${(action.tags ?? []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));

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

      return h(Modal, {
        title: t('groups.title'),
        t,
        onClose: props.onClose,
        footer: h(Button, { onClick: props.onClose }, t('action.close')),
      },
      h('p', { className: 'ah-hint' }, t('groups.hint')),
      h('div', { className: 'ah-settings-row' },
        h('div', { className: 'ah-settings-row-main' },
          h('input', {
            className: 'ah-input',
            value: name,
            placeholder: t('groups.namePlaceholder'),
            onChange: (event) => setName(event.target.value),
            onKeyDown: (event) => {
              if (event.key !== 'Enter' || name.trim() === '') return;
              event.preventDefault();
              void run(async () => {
                const result = await api('/groups/create', { name: name.trim() });
                setName('');
                setSelectedId(result.group.id);
              });
            },
          })),
        h(Button, { primary: true, disabled: busy || name.trim() === '', onClick: () => void run(async () => {
          const result = await api('/groups/create', { name: name.trim() });
          setName('');
          setSelectedId(result.group.id);
        }) }, t('groups.create'))),
      h('div', { className: 'ah-scope-list' },
        groups.map((group) => h('div', {
          key: group.id,
          className: 'ah-settings-row',
          'data-active': group.id === active?.id,
          onClick: () => setSelectedId(group.id),
        },
        h('div', { className: 'ah-settings-row-main' },
          h('span', { className: 'ah-settings-row-title' }, group.name),
          group.builtin ? h('span', { className: 'ah-badge' }, t('editor.groupCommon')) : null,
          h('span', { className: 'ah-count' }, t('groups.actionCount', { count: actions.filter((action) => (action.groups ?? []).includes(group.id)).length }))),
        group.builtin ? null : h(Button, { ghost: true, small: true, onClick: (event) => {
          event.stopPropagation();
          const next = window.prompt(t('groups.renamePrompt'), group.name);
          if (next === null || next.trim() === '' || next.trim() === group.name) return;
          void run(() => api('/groups/rename', { id: group.id, name: next.trim() }));
        } }, t('groups.rename')),
        group.builtin ? null : h(Button, { ghost: true, small: true, danger: true, onClick: (event) => {
          event.stopPropagation();
          if (window.confirm(t('groups.deleteConfirm', { name: group.name }))) {
            void run(async () => {
              await api('/groups/delete', { id: group.id });
              if (selectedId === group.id) setSelectedId('');
            });
          }
        } }, t('groups.delete'))))),
      active === null ? null : h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('groups.actionsTitle', { name: active.name })),
        h(SearchField, { value: query, placeholder: t('groups.actionSearch'), onChange: setQuery }),
        h('div', { className: 'ah-scope-list' }, filteredActions.map((action) => h('label', { key: action.id, className: 'ah-scope-option' },
          h('input', {
            type: 'checkbox',
            checked: activeNames.includes(action.name),
            disabled: busy,
            onChange: (event) => {
              const next = event.target.checked
                ? [...new Set([...activeNames, action.name])]
                : activeNames.filter((entry) => entry !== action.name);
              void run(() => api('/groups/actions', { id: active.id, actions: next }));
            },
          }),
          ` ${action.name}`,
          action.builtin ? h('span', { className: 'ah-badge' }, t('lib.builtin')) : null)))),
      error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error));
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
      const [profile, setProfile] = React.useState(() => {
        const found = scopes.find((entry) => String(entry.path).toLowerCase() === String(initialPath).toLowerCase());
        return found ?? { path: initialPath, label: '', groups: ['common'], actions: [] };
      });
      const [query, setQuery] = React.useState('');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);

      const selectProject = (path) => {
        setProjectPath(path);
        const found = scopes.find((entry) => String(entry.path).toLowerCase() === String(path).toLowerCase());
        setProfile(found ?? { path, label: '', groups: ['common'], actions: [] });
      };

      const toggleGroup = (id, checked) => {
        setProfile((previous) => ({
          ...previous,
          groups: checked ? [...new Set([...previous.groups, id])] : previous.groups.filter((entry) => entry !== id),
        }));
      };
      const toggleAction = (name, checked) => {
        setProfile((previous) => ({
          ...previous,
          actions: checked ? [...new Set([...previous.actions, name])] : previous.actions.filter((entry) => entry !== name),
        }));
      };
      const covered = (action) => profile.groups.some((id) => (action.groups ?? []).includes(id));
      const projectOptions = [...projects];
      for (const scope of scopes) {
        if (!projectOptions.some((project) => String(project.path).toLowerCase() === String(scope.path).toLowerCase())) {
          projectOptions.push({ label: scope.label || scope.path, path: scope.path, stale: true });
        }
      }
      const filtered = query.trim() === ''
        ? actions
        : actions.filter((action) => `${action.name} ${action.description} ${(action.tags ?? []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));

      const save = async () => {
        setBusy(true);
        setError('');
        try {
          await api('/project-scope', {
            path: projectPath,
            label: projectOptions.find((project) => project.path === projectPath)?.label ?? '',
            groups: profile.groups,
            actions: profile.actions,
          });
          await props.onChanged?.();
          props.onClose?.();
        } catch (failure) {
          setError(describeError(failure));
        } finally {
          setBusy(false);
        }
      };

      return h(Modal, {
        title: t('scope.title'),
        t,
        onClose: props.onClose,
        footer: h(React.Fragment, null,
          h(Button, { onClick: props.onClose }, t('action.cancel')),
          h(Button, { primary: true, disabled: busy || projectPath === '', onClick: save }, t('action.save'))),
      },
      h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('scope.project')),
        h('select', { className: 'ah-input', value: projectPath, onChange: (event) => selectProject(event.target.value) },
          projectOptions.map((project) => h('option', { key: project.path, value: project.path }, `${project.label}${project.stale ? ` (${t('editor.scopeStale')})` : ''}`)))),
      h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('scope.groups')),
        h('div', { className: 'ah-scope-list' }, groups.map((group) => h('label', { key: group.id, className: 'ah-scope-option' },
          h('input', {
            type: 'checkbox',
            checked: profile.groups.includes(group.id),
            onChange: (event) => toggleGroup(group.id, event.target.checked),
          }),
          ` ${group.name}`)))),
      h('div', { className: 'ah-field' },
        h('label', { className: 'ah-label' }, t('scope.extraActions')),
        h(SearchField, { value: query, placeholder: t('scope.searchActions'), onChange: setQuery }),
        h('div', { className: 'ah-scope-list' }, filtered.map((action) => h('label', { key: action.id, className: 'ah-scope-option' },
          h('input', {
            type: 'checkbox',
            checked: profile.actions.includes(action.name),
            disabled: covered(action),
            onChange: (event) => toggleAction(action.name, event.target.checked),
          }),
          ` ${action.name}`,
          covered(action) ? h('span', { className: 'ah-badge' }, t('scope.viaGroup')) : null)))),
      error === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'error', role: 'alert' }, error));
    }
