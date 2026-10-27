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
          props.state === 'off'
            ? null
            : h(props.state === 'blocked' ? Icons.close : Icons.check, { size: 10 })));
    }

    function GroupDialog(props) {
      const { t } = props;
      const groups = Array.isArray(props.groups) ? props.groups : [];
      const defaultGroup = typeof props.defaultGroup === 'string' ? props.defaultGroup : '';
      const actions = Array.isArray(props.actions) ? props.actions : [];
      const [name, setName] = React.useState('');
      const [selectedId, setSelectedId] = React.useState(() => groups[0]?.id ?? '');
      const [drafts, setDrafts] = React.useState({});
      const [query, setQuery] = React.useState('');
      const [regex, setRegex] = React.useState(false);
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
      const matchesSearch = compileSearch(query, regex);
      const filtered = actions.filter((action) => {
        if (filter === 'selected' && !activeDirectSet.has(action.name)) return false;
        if (filter === 'unselected' && activeDirectSet.has(action.name)) return false;
        if (query.trim() === '') return true;
        return matchesSearch(`${action.name} ${action.description}`);
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

      const setAsDefault = async (group) => {
        await run(async () => {
          await api('/groups/default', { id: group.id });
          setMenu(null);
        });
      };
      const setGlobal = async (group, global) => {
        await run(async () => {
          await api('/groups/global', { id: group.id, global });
          setMenu(null);
        });
      };

      const groupRows = groups.map((group) => {
        const renaming = renamingId === group.id;
        const titleRow = h('div', { className: 'ah-group-item-main' },
          h('span', { className: 'ah-group-name' }, group.name),
          group.global === true ? h('span', { className: 'ah-badge' }, t('groups.globalBadge')) : null,
          defaultGroup === group.id ? h('span', { className: 'ah-badge' }, t('groups.workspaceDefault')) : null);
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
          const state = checked ? 'on' : effective ? 'inherited' : 'off';
          return h('label', {
            key: child.id,
            className: 'ah-group-include',
            'data-checked': checked,
            'data-effective': effective,
            'data-state': state,
          },
          h(ActionCheck, {
            checked,
            state,
            disabled: busy,
            onChange: (event) => toggleInclude(child, event.target.checked),
          }),
          h('span', { className: 'ah-group-include-name' }, child.name),
          h('span', { className: 'ah-count' }, t('groups.actionCount', { count: namesFor(child.id).size })));
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
        h(SearchField, { value: query, placeholder: t('groups.actionSearch'), onChange: setQuery, regex, regexTitle: t('search.regexTitle'), onToggleRegex: () => setRegex((previous) => !previous) }),
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
      const menuItems = [];
      if (menuGroup !== null && defaultGroup !== menuGroup.id) {
        menuItems.push(h('button', {
          key: 'default',
          type: 'button',
          className: 'ah-group-context-item',
          onClick: () => { setMenu(null); void setAsDefault(menuGroup); },
        }, t('groups.setDefault')));
      }
      if (menuGroup !== null) {
        menuItems.push(h('button', {
          key: 'global',
          type: 'button',
          className: 'ah-group-context-item',
          onClick: () => { setMenu(null); void setGlobal(menuGroup, menuGroup.global !== true); },
        }, menuGroup.global === true ? t('groups.clearGlobal') : t('groups.makeGlobal')));
        menuItems.push(h('button', {
          key: 'rename',
          type: 'button',
          className: 'ah-group-context-item',
          onClick: () => { setMenu(null); startRename(menuGroup); },
        }, t('groups.rename')));
        menuItems.push(h('button', {
          key: 'delete',
          type: 'button',
          className: 'ah-group-context-item',
          'data-danger': 'true',
          onClick: () => { setMenu(null); void removeGroup(menuGroup); },
        }, t('groups.delete')));
      }
      const contextMenu = menuGroup === null ? null : h('div', {
        className: 'ah-group-context',
        style: { left: `${menu.x}px`, top: `${menu.y}px` },
        onMouseDown: (event) => event.stopPropagation(),
      }, menuItems);

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
        hideClose: true,
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
      const defaultGroup = typeof props.defaultGroup === 'string' ? props.defaultGroup : '';
      const actions = Array.isArray(props.actions) ? props.actions : [];
      const currentProject = props.currentProject ?? null;
      const initialPath = currentProject?.path ?? scopes[0]?.path ?? projects[0]?.path ?? '';
      const [projectPath, setProjectPath] = React.useState(initialPath);
      const [drafts, setDrafts] = React.useState({});
      const [query, setQuery] = React.useState('');
      const [regex, setRegex] = React.useState(false);
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);

      const keyOf = (value) => String(value ?? '').toLowerCase();
      const normalizeProfile = (raw, path) => ({
        path,
        label: typeof raw?.label === 'string' ? raw.label : '',
        groups: Array.isArray(raw?.groups) ? raw.groups : (defaultGroup === '' ? [] : [defaultGroup]),
        actions: Array.isArray(raw?.actions) ? raw.actions : [],
        excludeGroups: Array.isArray(raw?.excludeGroups) ? raw.excludeGroups : [],
        excludeActions: Array.isArray(raw?.excludeActions) ? raw.excludeActions : [],
      });
      const originalFor = (path) => {
        const found = scopes.find((entry) => keyOf(entry.path) === keyOf(path));
        return normalizeProfile(found ?? { path, label: '', groups: defaultGroup === '' ? [] : [defaultGroup], actions: [] }, path);
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
        return differs(before.groups, after.groups)
          || differs(before.actions, after.actions)
          || differs(before.excludeGroups, after.excludeGroups)
          || differs(before.excludeActions, after.excludeActions);
      });
      const dirtyCount = dirtyProjects.reduce((sum, project) => {
        const before = originalFor(project.path);
        const after = draftFor(project.path);
        const groupsAdded = after.groups.filter((entry) => !before.groups.includes(entry)).length;
        const groupsRemoved = before.groups.filter((entry) => !after.groups.includes(entry)).length;
        const actionsAdded = after.actions.filter((entry) => !before.actions.includes(entry)).length;
        const actionsRemoved = before.actions.filter((entry) => !after.actions.includes(entry)).length;
        const excludedChanged = differs(before.excludeGroups, after.excludeGroups) || differs(before.excludeActions, after.excludeActions) ? 1 : 0;
        return sum + groupsAdded + groupsRemoved + actionsAdded + actionsRemoved + excludedChanged;
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
      const globalGroupIds = groups.filter((group) => group.global === true).map((group) => group.id);
      const grantedGroups = expandGroups([...profile.groups, ...globalGroupIds]);
      const directGroups = expandGroups(profile.groups);
      const blockedGroups = new Set([...expandGroups(profile.excludeGroups)].filter((id) => !directGroups.has(id)));
      const groupState = (id) => {
        if (profile.groups.includes(id)) return 'on';
        if (blockedGroups.has(id)) return 'blocked';
        if (grantedGroups.has(id)) return 'inherited';
        return 'off';
      };
      const groupCountForProfile = (target) => {
        const direct = expandGroups(target.groups);
        const roots = new Set([...target.groups, ...globalGroupIds]);
        const blocked = new Set([...expandGroups(target.excludeGroups)].filter((id) => !direct.has(id)));
        return [...roots].filter((id) => !blocked.has(id)).length;
      };
      const actionState = (action) => {
        if (profile.actions.includes(action.name)) return 'on';
        if (profile.excludeActions.includes(action.name)) return 'blocked';
        const inGrant = (action.groups ?? []).some((id) => grantedGroups.has(id));
        if (action.builtin === true) return inGrant ? 'inherited' : 'off';
        const activeGrant = (action.groups ?? []).some((id) => grantedGroups.has(id) && !blockedGroups.has(id));
        return inGrant && activeGrant ? 'inherited' : inGrant ? 'blocked' : 'off';
      };
      const actionAvailableNow = (action) => {
        if (profile.actions.includes(action.name)) return true;
        if (profile.excludeActions.includes(action.name)) return false;
        if (action.builtin === true) return true;
        return (action.groups ?? []).some((id) => grantedGroups.has(id) && !blockedGroups.has(id));
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
      const selectedActionCount = actions.filter((action) => actionAvailableNow(action)).length;
      const matchesSearch = compileSearch(query, regex);
      const filtered = query.trim() === ''
        ? actions
        : actions.filter((action) => matchesSearch(`${action.name} ${action.description}`));

      const selectProject = (path) => {
        setProjectPath(path);
      };
      const toggleGroup = (id) => {
        const state = groupState(id);
        updateProfile((previous) => {
          if (state === 'on') {
            return { ...previous, groups: previous.groups.filter((entry) => entry !== id) };
          }
          if (state === 'blocked') {
            if (previous.excludeGroups.includes(id)) {
              return { ...previous, excludeGroups: previous.excludeGroups.filter((entry) => entry !== id) };
            }
            return {
              ...previous,
              groups: [...new Set([...previous.groups, id])],
              excludeGroups: previous.excludeGroups.filter((entry) => entry !== id),
            };
          }
          if (state === 'inherited') {
            return { ...previous, excludeGroups: [...new Set([...previous.excludeGroups, id])] };
          }
          return {
            ...previous,
            groups: [...new Set([...previous.groups, id])],
            excludeGroups: previous.excludeGroups.filter((entry) => entry !== id),
          };
        });
      };
      const toggleAction = (action) => {
        const state = actionState(action);
        updateProfile((previous) => {
          if (state === 'on') {
            return { ...previous, actions: previous.actions.filter((entry) => entry !== action.name) };
          }
          if (state === 'blocked') {
            if (previous.excludeActions.includes(action.name)) {
              return { ...previous, excludeActions: previous.excludeActions.filter((entry) => entry !== action.name) };
            }
            return {
              ...previous,
              actions: [...new Set([...previous.actions, action.name])],
              excludeActions: previous.excludeActions.filter((entry) => entry !== action.name),
            };
          }
          if (state === 'inherited') {
            return { ...previous, excludeActions: [...new Set([...previous.excludeActions, action.name])] };
          }
          return {
            ...previous,
            actions: [...new Set([...previous.actions, action.name])],
            excludeActions: previous.excludeActions.filter((entry) => entry !== action.name),
          };
        });
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
              excludeGroups: draft.excludeGroups,
              excludeActions: draft.excludeActions,
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
      h('span', { className: 'ah-group-count' }, t('scope.groupCount', { count: groupCountForProfile(draftFor(project.path)) }))));

      const projectHead = h('header', { className: 'ah-group-detail-head' },
        h('div', { className: 'ah-scope-project-head' },
          h('h3', { className: 'ah-group-detail-title' }, profile.label || projectPath || t('scope.project')),
          h('span', { className: 'ah-scope-project-path', title: projectPath }, projectPath || t('scope.noProjects')),
          h('span', { className: 'ah-count' }, t('groups.actionCount', { count: selectedActionCount }))));

      const groupBlock = h('div', { className: 'ah-group-includes' },
        h('div', { className: 'ah-group-section-label' }, t('scope.groups')),
        h('p', { className: 'ah-hint' }, t('scope.groupsHint')),
        h('div', { className: 'ah-group-include-list' }, groups.map((group) => {
          const state = groupState(group.id);
          const checked = state === 'on';
          const global = group.global === true;
          return h('label', {
            key: group.id,
            className: 'ah-group-include',
            'data-checked': checked,
            'data-effective': state !== 'off',
            'data-state': state,
          },
          h(ActionCheck, {
            checked,
            state,
            disabled: busy,
            onChange: () => toggleGroup(group.id),
          }),
          h('span', { className: 'ah-group-include-name' }, group.name),
          global ? h('span', { className: 'ah-badge' }, t('groups.globalBadge')) : null,
          h('span', { className: 'ah-count' }, t('groups.actionCount', { count: groupActionCount(group.id) })));
        })));

      const actionTools = h('div', { className: 'ah-group-tools' },
        h('p', { className: 'ah-hint' }, t('scope.extraHint')),
        h(SearchField, { value: query, placeholder: t('scope.searchActions'), onChange: setQuery, regex, regexTitle: t('search.regexTitle'), onToggleRegex: () => setRegex((previous) => !previous) }));

      const actionRows = h('div', { className: 'ah-group-actions' },
        filtered.length === 0
          ? h('div', { className: 'ah-group-empty' }, t('groups.noMatch'))
          : filtered.map((action) => {
            const state = actionState(action);
            const direct = state === 'on';
            const inherited = state === 'inherited';
            const blocked = state === 'blocked';
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
              onChange: () => toggleAction(action),
            }),
            h('span', { className: 'ah-group-action-main' },
              h('span', { className: 'ah-group-action-name' }, action.name),
              h('span', { className: 'ah-group-action-desc' }, action.description || '')),
            h('span', { className: 'ah-badge' }, action.mode === 'skill' ? t('lib.skill') : t('lib.command')),
            inherited ? h('span', { className: 'ah-badge' }, t('scope.viaGroup')) : null,
            blocked ? h('span', { className: 'ah-badge' }, t('scope.blocked')) : null);
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
        hideClose: true,
        onClose: close,
        footer,
      },
      layout,
      errorView);
    }
