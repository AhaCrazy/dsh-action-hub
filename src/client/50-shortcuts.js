    // ------------------------------------------------------------- shortcuts

    const DEFAULT_HOTKEY = { code: 'KeyA', modifiers: ['alt'] };

    function eventCode(event) {
      if (typeof event.code === 'string' && event.code !== '') return event.code;
      const key = typeof event.key === 'string' ? event.key : '';
      if (/^[a-z]$/iu.test(key)) return `Key${key.toUpperCase()}`;
      if (/^[0-9]$/u.test(key)) return `Digit${key}`;
      const names = {
        ' ': 'Space',
        Escape: 'Escape',
        Enter: 'Enter',
        Tab: 'Tab',
        Backspace: 'Backspace',
        ArrowUp: 'ArrowUp',
        ArrowDown: 'ArrowDown',
        ArrowLeft: 'ArrowLeft',
        ArrowRight: 'ArrowRight',
        Home: 'Home',
        End: 'End',
        '.': 'Period',
        ',': 'Comma',
        '/': 'Slash',
        ';': 'Semicolon',
        "'": 'Quote',
        '[': 'BracketLeft',
        ']': 'BracketRight',
        '\\': 'Backslash',
        '-': 'Minus',
        '=': 'Equal',
        '`': 'Backquote',
      };
      return names[key] ?? key;
    }

    function matchesBinding(event, binding) {
      const value = binding !== null && typeof binding === 'object' ? binding : DEFAULT_HOTKEY;
      const modifiers = Array.isArray(value.modifiers) ? value.modifiers : [];
      return eventCode(event) === value.code
        && Boolean(event.ctrlKey) === modifiers.includes('ctrl')
        && Boolean(event.altKey) === modifiers.includes('alt')
        && Boolean(event.shiftKey) === modifiers.includes('shift')
        && Boolean(event.metaKey) === modifiers.includes('meta');
    }

    /**
     * Register the command in the DSH shortcut registry so it appears (and can be
     * rebound) in Settings → General → Shortcuts. The Web registry refuses
     * Alt+A as a default, so on Web the command starts unbound and the plugin
     * handles Alt+A itself until the user assigns a registry binding; once they
     * do, the registry binding takes over.
     */
    function createShortcutStore(ctx, palette, t) {
      const service = typeof ctx?.get === 'function' ? ctx.get('shortcuts') : ctx?.shortcuts;
      const fallbackKeys = () => (MAC ? ['⌥', 'A'] : ['Alt', '+', 'A']);
      const fallbackManageKeys = () => (MAC ? ['⌘', '⌥', 'A'] : ['Ctrl', '+', 'Alt', '+', 'A']);
      const listeners = new Set();
      let state = {
        keys: fallbackKeys(),
        manageKeys: fallbackManageKeys(),
        aria: undefined,
        registered: false,
        available: service !== undefined,
      };
      let registrationOff = null;
      let manageRegistrationOff = null;
      let manualOff = null;
      let manageManualOff = null;
      let catalogOff = null;

      const emit = () => {
        for (const listener of [...listeners]) listener(state);
      };

      const togglePalette = () => {
        const current = (typeof window !== 'undefined' ? window.__dshActionHubPalette : undefined) ?? palette;
        const currentState = current.get();
        if (currentState.open) {
          current.close();
          return;
        }
        if (currentState.bridge === null) return;
        current.open();
      };

      const openManage = () => {
        palette.close();
        try {
          ctx.get('layout')?.selectPanel?.(PANEL_ID);
        } catch {
          /* the layout service is optional */
        }
      };

      const catalogRow = (id) => {
        try {
          const rows = service?.catalog?.getSnapshot?.();
          return Array.isArray(rows) ? rows.find((entry) => entry.id === id) : undefined;
        } catch {
          return undefined;
        }
      };

      const installManual = () => {
        if (manualOff !== null) return;
        const onKey = (event) => {
          if (!matchesBinding(event, DEFAULT_HOTKEY)) return;
          if (palette.get().bridge === null) return;
          event.preventDefault();
          event.stopPropagation();
          togglePalette();
        };
        document.addEventListener('keydown', onKey, true);
        manualOff = () => document.removeEventListener('keydown', onKey, true);
      };

      const manageBinding = () => (MAC ? { code: 'KeyA', modifiers: ['meta', 'alt'] } : { code: 'KeyA', modifiers: ['ctrl', 'alt'] });
      const installManageManual = () => {
        if (manageManualOff !== null) return;
        const onKey = (event) => {
          if (!matchesBinding(event, manageBinding())) return;
          if (typeof ctx?.get !== 'function') return;
          event.preventDefault();
          event.stopPropagation();
          openManage();
        };
        document.addEventListener('keydown', onKey, true);
        manageManualOff = () => document.removeEventListener('keydown', onKey, true);
      };

      const refresh = () => {
        const row = catalogRow('action-hub.palette');
        const manageRow = catalogRow('action-hub.manage');
        const bound = row !== undefined && Array.isArray(row.keys) && row.keys.length > 0;
        const manageBound = manageRow !== undefined && Array.isArray(manageRow.keys) && manageRow.keys.length > 0;
        if (bound) {
          manualOff?.();
          manualOff = null;
        } else {
          installManual();
        }
        if (manageBound) {
          manageManualOff?.();
          manageManualOff = null;
        } else {
          installManageManual();
        }
        state = {
          keys: bound ? row.keys : fallbackKeys(),
          manageKeys: manageBound ? manageRow.keys : fallbackManageKeys(),
          aria: row?.aria,
          registered: bound,
          available: service !== undefined,
        };
        emit();
      };

      const sync = () => {
        if (service === undefined || typeof service.register !== 'function') {
          installManual();
          refresh();
          return;
        }
        registrationOff?.();
        registrationOff = null;
        manageRegistrationOff?.();
        manageRegistrationOff = null;
        const defaults = {};
        for (const platform of ['macos', 'windows', 'linux']) {
          defaults[`desktop:${platform}`] = { code: 'KeyA', modifiers: ['alt'] };
        }
        try {
          registrationOff = service.register({
            id: 'action-hub.palette',
            label: () => t('shortcut.open'),
            aliases: ['action hub', 'actions', 'palette', '收藏夹'],
            defaults,
            regions: ['page', 'editable'],
            modals: [],
            resolve: () => ({ status: 'handled', run: togglePalette }),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.startsWith('Duplicate shortcut command')) {
            console.warn('[action-hub] shortcut registration failed, using a local listener:', error);
          }
        }
        try {
          manageRegistrationOff = service.register({
            id: 'action-hub.manage',
            label: () => t('shortcut.manage'),
            aliases: ['manage actions', 'action hub manage', '管理'],
            defaults: {},
            regions: ['page', 'editable'],
            modals: [],
            resolve: () => ({ status: 'handled', run: openManage }),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.startsWith('Duplicate shortcut command')) {
            console.warn('[action-hub] manage shortcut registration failed:', error);
          }
        }
        refresh();
      };

      const offCatalog = typeof service?.catalog?.subscribe === 'function'
        ? service.catalog.subscribe(() => refresh())
        : undefined;
      sync();

      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        sync,
        keysText: () => state.keys.join(''),
        dispose() {
          offCatalog?.();
          registrationOff?.();
          manageRegistrationOff?.();
          manualOff?.();
          manageManualOff?.();
          listeners.clear();
        },
      };
    }

    function useShortcutStore(store) {
      const [snapshot, setSnapshot] = React.useState(() => store.get());
      React.useEffect(() => store.subscribe(setSnapshot), [store]);
      return snapshot;
    }

    // Action reference chips: `/ah-...` is the wire spelling of an Action, but
    // the transcript shows the human name instead.
    const chipNames = new Map();
