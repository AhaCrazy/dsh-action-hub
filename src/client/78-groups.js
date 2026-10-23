    // -------------------------------------------------------- groups & scopes

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
        if (dirtyCount > 0 && !window.confirm(t('groups.discard', { count: dirtyCount }))) return;
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
          props.onClose?.();
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


      const childGroups = active === null ? [] : groups.filter((group) => group.id !== active.id);
      const includesBlock = active === null ? null : h('div', { className: 'ah-group-includes' },
        h('div', { className: 'ah-group-section-label' }, t('groups.includesTitle')),
        h('p', { className: 'ah-hint' }, t('groups.includesHint')),
        h('div', { className: 'ah-group-include-list' }, childGroups.map((child) => {
          const checked = activeIncludes.includes(child.id);
          const cycle = !checked && reachesGroup(child.id, active.id);
          return h('label', { key: child.id, className: 'ah-group-include', 'data-checked': checked, 'data-cycle': cycle },
            h('input', {
              type: 'checkbox',
              checked,
              disabled: busy,
              onChange: (event) => toggleInclude(child, event.target.checked),
            }),
            h('span', { className: 'ah-group-include-name' }, child.name),
            h('span', { className: 'ah-count' }, t('groups.actionCount', { count: namesFor(child.id).size })),
            cycle ? h('span', { className: 'ah-badge' }, t('groups.cycleHint')) : null);
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
            return h('label', {
              key: action.id,
              className: 'ah-group-action',
              'data-checked': activeDirectSet.has(action.name),
            },
            h('input', {
              type: 'checkbox',
              checked: activeDirectSet.has(action.name),
              disabled: inheritedOnly || busy,
              onChange: () => toggle(action),
            }),
            h('span', { className: 'ah-group-action-main' },
              h('span', { className: 'ah-group-action-name' }, action.name),
              h('span', { className: 'ah-group-action-desc' }, action.description || '')),
            h('span', { className: 'ah-badge' }, action.mode === 'skill' ? t('lib.skill') : t('lib.command')),
            inheritedOnly ? h('span', { className: 'ah-badge' }, t('groups.inheritedBadge')) : null,
            (action.groups ?? []).filter((id) => id !== active.id).map((id) => h('span', { key: id, className: 'ah-badge' }, groupLabel(id))));
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

      return h(Modal, {
        title: t('groups.title'),
        t,
        wide: true,
        onClose: close,
        footer: h(React.Fragment, null,
          h('span', { className: 'ah-group-dirty' }, dirtyCount > 0 ? t('groups.unsaved', { count: dirtyCount }) : t('groups.noChanges')),
          h(Button, { onClick: close }, t('action.cancel')),
          h(Button, { primary: true, disabled: busy || dirtyCount === 0, onClick: save }, t('groups.save'))),
      },
      h('div', { className: 'ah-group-create' },
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
        h(Button, { primary: true, disabled: busy || name.trim() === '', onClick: () => void createGroup() }, t('groups.create'))),
      layout,
      contextMenu,
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
