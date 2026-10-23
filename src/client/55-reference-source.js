    function setChipNames(snapshot) {
      chipNames.clear();
      const handles = snapshot?.meta?.handles ?? {};
      for (const action of snapshot?.actions ?? []) {
        const handle = handles[action.id];
        if (typeof handle === 'string' && handle !== '') chipNames.set(handle, action.name);
      }
    }

    let referenceSourceOff = null;

    /**
     * Register the reference source that owns Action chips. The prompt
     * serializer routes every chip through its owner's codec; ours writes the
     * opaque `/ah-…` marker so the Host can expand it, while the chip keeps
     * showing the Action name.
     */
    function installActionReferenceSource(ctx) {
      if (referenceSourceOff !== null) return true;
      const inputTriggers = typeof ctx?.get === 'function' ? ctx.get('inputTriggers') : ctx?.inputTriggers;
      if (inputTriggers === undefined || typeof inputTriggers.registerSource !== 'function') {
        if (typeof ctx?.inject === 'function') {
          try {
            ctx.inject(['inputTriggers'], (child) => {
              installActionReferenceSource(child);
            });
          } catch (error) {
            console.warn('[action-hub] cannot wait for the input-trigger service:', error);
          }
        }
        return false;
      }
      try {
        referenceSourceOff = inputTriggers.registerSource({
          trigger: '/',
          name: 'action',
          // The pipeline always calls `.then()` on this result; a bare array
          // throws before later sources (commands, skills) are fetched.
          candidates: async () => [],
          onPick: () => undefined,
          codec: {
            clipboardText: (ref) => ref,
            serialize: async (ref) => ref,
          },
        });
        return true;
      } catch (error) {
        console.warn('[action-hub] reference source registration failed:', error);
        return false;
      }
    }

    const ACTION_MARKER_PATTERN = /(^|\s)\/(ah-[0-9a-f]{10})(?![0-9a-f])/gu;

    /**
     * Match one Action marker in a user message. A boundary is required before
     * the slash, but not after the handle: users often type immediately after
     * the chip, and the stored text then reads `/ah-…再测试一下`.
     *
     * @param {string} text
     * @param {number} from
     * @param {ReadonlyMap<string, string>} names
     * @returns {{ id: string, start: number, end: number, data: { name: string, handle: string } } | undefined}
     */
    function matchActionMarker(text, from, names) {
      ACTION_MARKER_PATTERN.lastIndex = from;
      for (let token = ACTION_MARKER_PATTERN.exec(text); token !== null; token = ACTION_MARKER_PATTERN.exec(text)) {
        const name = names.get(token[2]);
        if (name === undefined) continue;
        const start = token.index + token[1].length;
        return { id: 'action-hub', start, end: start + 1 + token[2].length, data: { name, handle: token[2] } };
      }
      return undefined;
    }

    let chipRuleInstalled = false;

    function installActionChipRule(ctx) {
      if (chipRuleInstalled) return true;
      const userText = typeof ctx?.get === 'function'
        ? ctx.get('uiConversation')?.userText
        : ctx?.uiConversation?.userText;
      if (userText === undefined || typeof userText.register !== 'function') {
        // The conversation service may activate after this row; wait for it once.
        if (typeof ctx?.inject === 'function') {
          try {
            ctx.inject(['uiConversation'], (child) => {
              installActionChipRule(child);
            });
          } catch (error) {
            console.warn('[action-hub] cannot wait for the conversation service:', error);
          }
        }
        return false;
      }
      try {
        userText.register({
          id: 'action-hub',
          order: 15,
          match(text, from) {
            return matchActionMarker(text, from, chipNames);
          },
        });
        chipRuleInstalled = true;
        return true;
      } catch (error) {
        console.warn('[action-hub] user-text rule registration failed:', error);
        return false;
      }
    }

    function createPalette() {
      const listeners = new Set();
      let state = {
        open: false,
        mode: 'browse',
        query: '',
        category: '',
        selectedId: null,
        args: '',
        toast: '',
        toastKind: 'ok',
        bridge: null,
      };
      const emit = () => {
        for (const listener of [...listeners]) listener(state);
      };
      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        update(patch) {
          state = { ...state, ...patch };
          emit();
        },
        setBridge(bridge) {
          state = { ...state, bridge };
          emit();
        },
        clearBridge(sessionId) {
          if (state.bridge !== null && state.bridge.sessionId !== sessionId) return;
          state = { ...state, bridge: null, open: false };
          emit();
        },
        open() {
          state = { ...state, open: true, mode: 'browse', query: '', category: '', args: '', toast: '', toastKind: 'ok' };
          emit();
        },
        close() {
          state = { ...state, open: false, mode: 'browse' };
          emit();
        },
        toggle() {
          if (state.open) {
            state = { ...state, open: false };
            emit();
          } else {
            state = { ...state, open: true, mode: 'browse', query: '', category: '', args: '', toast: '', toastKind: 'ok' };
            emit();
          }
        },
        toastMessage(text, kind = 'ok') {
          state = { ...state, toast: text, toastKind: kind };
          emit();
        },
      };
    }
