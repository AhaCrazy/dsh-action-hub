    // ------------------------------------------------------------------ page

    function ActionRow(props) {
      const { action, t } = props;
      const used = action.usage?.count ?? 0;
      const selectMode = props.selectMode === true;
      const selected = props.selected === true;
      const activate = () => {
        if (selectMode) props.onToggle();
        else props.onOpen(action);
      };
      return h('div', {
        className: 'ah-row',
        'data-selected': selectMode ? selected : undefined,
        role: selectMode ? 'checkbox' : 'button',
        'aria-checked': selectMode ? selected : undefined,
        tabIndex: 0,
        'aria-label': action.name,
        onClick: activate,
        onContextMenu: (event) => {
          if (selectMode) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          props.onContextMenu(action, event);
        },
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate();
          }
        },
      },
      selectMode
        ? h('input', {
          type: 'checkbox',
          className: 'ah-row-check',
          checked: selected,
          'aria-label': action.name,
          onClick: (event) => event.stopPropagation(),
          onChange: () => props.onToggle(),
        })
        : h('button', {
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
          action.builtin === true ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.builtin')) : null,
          action.mode === 'skill' ? h('span', { className: 'ah-badge ah-badge-warn' }, t('lib.skill')) : h('span', { className: 'ah-badge' }, t('lib.command'))),
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
