    // ----------------------------------------------------------------- stores

    function createHub() {
      const listeners = new Set();
      let snapshot = {
        status: 'idle',
        actions: [],
        projects: [],
        projectScopes: [],
        groups: [],
        defaultGroup: '',
        currentProject: null,
        currentProfile: null,
        meta: {},
        error: '',
      };
      let inflight = null;
      let activeSessionId = '';
      let refreshSeq = 0;

      const emit = () => {
        for (const listener of [...listeners]) listener(snapshot);
      };
      const set = (next) => {
        snapshot = next;
        emit();
      };

      async function refresh(force = false) {
        if (inflight !== null && !force) return inflight;
        const seq = ++refreshSeq;
        if (snapshot.status === 'idle' || snapshot.status === 'error') set({ ...snapshot, status: 'loading', error: '' });
        const suffix = activeSessionId === '' ? '' : `?sessionId=${encodeURIComponent(activeSessionId)}`;
        inflight = api(`/state${suffix}`).then(
          (data) => {
            if (seq !== refreshSeq) return snapshot;
            set({
              status: 'ready',
              actions: data.actions ?? [],
              projects: data.projects ?? [],
              projectScopes: data.projectScopes ?? [],
              groups: data.groups ?? [],
              defaultGroup: data.defaultGroup ?? '',
              currentProject: data.currentProject ?? null,
              currentProfile: data.currentProfile ?? null,
              meta: data.meta ?? {},
              error: '',
            });
            return snapshot;
          },
          (error) => {
            if (seq === refreshSeq) set({ ...snapshot, status: 'error', error: describeError(error) });
            throw error;
          },
        ).finally(() => {
          if (seq === refreshSeq) inflight = null;
        });
        return inflight;
      }

      async function call(route, body) {
        const data = await api(route, body);
        if (Array.isArray(data.actions)) set({ ...snapshot, status: 'ready', actions: data.actions, projects: data.projects ?? snapshot.projects, error: '' });
        else void refresh(true).catch(() => {});
        return data;
      }

      return {
        get: () => snapshot,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        refresh,
        setSession(id) {
          if (activeSessionId === id) return;
          activeSessionId = typeof id === 'string' ? id : '';
          void refresh(true).catch(() => {});
        },
        clearSession(id) {
          if (activeSessionId !== id) return;
          activeSessionId = '';
          void refresh(true).catch(() => {});
        },
        call,
        patchAction(id, patch) {
          return call('/update', { id, patch });
        },
        dispose() {
          listeners.clear();
        },
      };
    }

    function useHub(hub) {
      const [snapshot, setSnapshot] = React.useState(() => hub.get());
      React.useEffect(() => hub.subscribe(setSnapshot), [hub]);
      React.useEffect(() => {
        if (hub.get().status === 'idle') void hub.refresh().catch(() => {});
      }, [hub]);
      return snapshot;
    }

    function createPrefs() {
      const defaults = { closeAfterInsert: true, showTrigger: true, showSidebarEntry: true };
      let current = defaults;
      try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        if (raw) current = { ...defaults, ...JSON.parse(raw) };
      } catch {
        current = defaults;
      }
      const listeners = new Set();
      return {
        get: () => current,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        set(patch) {
          current = { ...current, ...patch };
          try {
            window.localStorage.setItem(PREFS_KEY, JSON.stringify(current));
          } catch {
            /* storage may be unavailable; the in-memory value still applies */
          }
          for (const listener of [...listeners]) listener(current);
        },
      };
    }

    function usePrefs(prefs) {
      const [snapshot, setSnapshot] = React.useState(() => prefs.get());
      React.useEffect(() => prefs.subscribe(setSnapshot), [prefs]);
      return snapshot;
    }
