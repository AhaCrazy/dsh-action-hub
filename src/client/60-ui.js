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
      check: iconOf([{ d: 'M3.2 8.4l3 3 6.6-6.8' }]),
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

    const regexShortcutStack = [];
    let regexShortcutBound = false;
    function bindRegexShortcut() {
      if (regexShortcutBound || typeof document === 'undefined') return;
      regexShortcutBound = true;
      document.addEventListener('keydown', (event) => {
        if (!event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== 'r') return;
        const toggle = regexShortcutStack[regexShortcutStack.length - 1];
        if (toggle === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }, true);
    }

    function SearchField(props) {
      const toggleRef = React.useRef(props.onToggleRegex);
      toggleRef.current = props.onToggleRegex;
      const hasToggle = typeof props.onToggleRegex === 'function';
      React.useEffect(() => {
        if (!hasToggle) return undefined;
        const toggle = () => toggleRef.current?.();
        regexShortcutStack.push(toggle);
        bindRegexShortcut();
        return () => {
          const index = regexShortcutStack.lastIndexOf(toggle);
          if (index >= 0) regexShortcutStack.splice(index, 1);
        };
      }, [hasToggle]);
      const handleKeyDown = (event) => {
        if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'r') {
          event.preventDefault();
          event.stopPropagation();
          toggleRef.current?.();
          return;
        }
        props.onKeyDown?.(event);
      };
      return h('div', { className: 'ah-search' },
        h('span', { className: 'ah-search-mark' }, h(Icons.search, { size: 14 })),
        h('input', {
          ref: props.inputRef,
          value: props.value,
          placeholder: props.placeholder,
          'aria-label': props.placeholder,
          onChange: (event) => props.onChange(event.target.value),
          onKeyDown: handleKeyDown,
        }),
        hasToggle
          ? h('button', {
            type: 'button',
            className: 'ah-search-regex',
            title: props.regexTitle,
            'aria-label': props.regexTitle,
            'aria-pressed': props.regex === true,
            'data-active': props.regex === true,
            onClick: () => toggleRef.current?.(),
          }, '.*')
          : null);
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
        className: props.wide ? 'ah-modal ah-modal-wide' : 'ah-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': props.title,
        tabIndex: -1,
        ref: panelRef,
      },
      h('div', { className: 'ah-modal-head' },
        props.head === undefined
          ? h('h2', { className: 'ah-modal-title' }, props.title)
          : props.head,
        props.hideClose === true ? null : h(Button, { ghost: true, iconOnly: true, small: true, onClick: props.onClose, title: props.t('action.close') }, h(Icons.close, { size: 13 }))),
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
