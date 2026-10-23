    // ----------------------------------------------------------------- settings

    function createSettings(hub, prefs) {
      return function ActionHubSettings(props) {
        const t = translate(props);
        const snapshot = useHub(hub);
        const state = usePrefs(prefs);
        const shortcuts = useShortcutStore(props.shortcuts);
        const [notice, setNotice] = React.useState('');
        const saved = (text) => {
          setNotice(text);
          setTimeout(() => setNotice(''), 2000);
        };

        return h('div', { className: 'ah-settings' },
          h('div', null,
            h('h2', { className: 'ah-modal-title', style: { margin: '0 0 6px' } }, t('settings.title')),
            h('p', { className: 'ah-sub', style: { margin: 0 } }, t('settings.desc'))),
          notice === '' ? null : h('div', { className: 'ah-notice', 'data-kind': 'ok', role: 'status' }, notice),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.behavior')),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.closeAfterInsert')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.closeAfterInsertDesc'))),
              h(Switch, { checked: state.closeAfterInsert, label: t('settings.closeAfterInsert'), onChange: (value) => { prefs.set({ closeAfterInsert: value }); saved(t('settings.saved')); } })),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.trigger')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.triggerDesc'))),
              h(Switch, { checked: state.showTrigger, label: t('settings.trigger'), onChange: (value) => { prefs.set({ showTrigger: value }); saved(t('settings.saved')); } })),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.sidebarEntry')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.sidebarEntryDesc'))),
              h(Switch, { checked: state.showSidebarEntry, label: t('settings.sidebarEntry'), onChange: (value) => { prefs.set({ showSidebarEntry: value }); saved(t('settings.saved')); } }))),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.shortcutsTitle')),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.hotkey')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.hotkeyDesc')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.hotkeyManage'))),
              h('span', { className: 'ah-kbd' }, shortcuts.keys.length > 0 ? shortcuts.keys.join('') : (MAC ? '⌥A' : 'Alt+A'))),
            h('div', { className: 'ah-settings-row' },
              h('div', { className: 'ah-settings-row-main' },
                h('span', { className: 'ah-settings-row-title' }, t('settings.manageHotkey')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.manageHotkeyDesc')),
                h('span', { className: 'ah-settings-row-desc' }, t('settings.manageHotkeyManage'))),
              h('span', { className: 'ah-kbd' }, shortcuts.manageKeys.length > 0 ? shortcuts.manageKeys.join('') : (MAC ? '⌘⌥A' : 'Ctrl+Alt+A'))),
            h('span', { className: 'ah-hint', style: { marginTop: '-2px' } }, t('settings.shortcutGroupHint'))),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.data')),
            h('p', { className: 'ah-settings-row-desc' }, t('settings.dataDesc', { path: snapshot.meta.dataFileDisplay ?? snapshot.meta.dataFile ?? '—', count: snapshot.actions.filter((action) => action.builtin !== true).length })),
            h('div', { className: 'ah-actions' },
              h(Button, { onClick: () => props.ctx.get('layout')?.selectPanel?.(PANEL_ID) }, t('settings.openLibrary')),
              h(Button, { onClick: async () => {
                try {
                  await downloadZip();
                  saved(t('lib.exported'));
                } catch (failure) {
                  saved(describeError(failure));
                }
              } }, t('settings.export')))),
          h('section', { className: 'ah-settings-card' },
            h('h3', { className: 'ah-settings-title' }, t('settings.about')),
            h('p', { className: 'ah-settings-row-desc' }, t('settings.aboutDesc', { version: VERSION }))));
      };
    }
