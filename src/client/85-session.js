    function usePalette(palette) {
      const [snapshot, setSnapshot] = React.useState(() => palette.get());
      React.useEffect(() => palette.subscribe(setSnapshot), [palette]);
      return snapshot;
    }

    // Session bridge: hands the frame-level palette the live composer facade.
    function createSessionBridge(palette, hub) {
      return function SessionBridge(props) {
        const input = typeof props.useInput === 'function' ? props.useInput((state) => state) : undefined;
        const sessionId = props.sessionId;
        const actions = props.inputActions;

        React.useEffect(() => {
          if (sessionId === undefined) return undefined;
          hub?.setSession(sessionId);
          return () => hub?.clearSession(sessionId);
        }, [sessionId]);

        React.useEffect(() => {
          if (sessionId === undefined || actions === undefined) return undefined;
          palette.setBridge({ sessionId, inputActions: actions, input });
          return () => palette.clearBridge(sessionId);
        }, [sessionId, actions, input?.draftRev, input?.phase, input?.draft]);

        return null;
      };
    }

    function createTrigger(palette) {
      return function ActionTrigger(props) {
        const t = translate(props);
        const prefs = usePrefs(props.prefs);
        const shortcut = useShortcutStore(props.shortcuts);
        const state = usePalette(palette);
        if (!prefs.showTrigger) return null;
        const keys = shortcut.keys.length > 0 ? shortcut.keys.join('') : (MAC ? '⌥A' : 'Alt+A');
        return h('button', {
          type: 'button',
          className: 'ah-trigger',
          'data-open': state.open,
          title: t('trigger.tooltip', { keys }),
          'aria-label': t('trigger.tooltip', { keys }),
          onClick: () => (state.open ? palette.close() : palette.open()),
        }, h(Icons.shelf, { size: 16 }));
      };
    }
