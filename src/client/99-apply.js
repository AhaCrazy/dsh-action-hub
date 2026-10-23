    // ----------------------------------------------------------------- plugin

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: TEXT.zh, en: TEXT.en }), 'action-hub: dictionaries');
      ctx.effect(() => {
        const style = document.createElement('style');
        style.setAttribute('data-dsh-action-hub', '');
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => style.remove();
      }, 'action-hub: styles');

      const t = ctx.locale.bind(NS);
      const hub = createHub();
      const prefs = createPrefs();
      const palette = createPalette();
      const shortcuts = createShortcutStore(ctx, palette, t);
      const previousPalette = typeof window !== 'undefined' ? window.__dshActionHubPalette : undefined;
      if (typeof window !== 'undefined') window.__dshActionHubPalette = palette;

      setChipNames(hub.get());
      ctx.effect(() => hub.subscribe(setChipNames), 'action-hub: reference names');
      installActionChipRule(ctx);
      ctx.effect(() => {
        installActionReferenceSource(ctx);
        return () => {
          referenceSourceOff?.();
          referenceSourceOff = null;
        };
      }, 'action-hub: reference source');

      ctx.effect(() => () => {
        hub.dispose();
        shortcuts.dispose();
        palette.close();
        if (typeof window !== 'undefined' && window.__dshActionHubPalette === palette) {
          window.__dshActionHubPalette = previousPalette;
        }
      }, 'action-hub: stores');

      const Page = createPage(hub, ctx);
      const PaletteView = createPaletteView(hub, palette, prefs, shortcuts);
      const SessionBridge = createSessionBridge(palette, hub);
      const Trigger = createTrigger(palette);
      const Settings = createSettings(hub, prefs);

      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, Page));

      ctx.slots.inject('sidebar.panellist', () => {
        let dispose = null;
        const sync = () => {
          dispose?.();
          dispose = null;
          if (prefs.get().showSidebarEntry === false) return;
          dispose = ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 32,
            label: () => t('app.name'),
            locale: NS,
          }, PanelIcon);
        };
        const off = prefs.subscribe(sync);
        sync();
        return () => {
          off();
          dispose?.();
        };
      });

      ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
        name: 'conversation.input.left',
        id: 'action-hub',
        order: 30,
        label: () => t('trigger.label'),
        locale: NS,
      }, (props) => h(Trigger, { ...props, prefs, shortcuts })));

      ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
        name: 'conversation.input.overlay',
        id: 'action-hub-bridge',
        order: 90,
        locale: NS,
      }, SessionBridge));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'action-hub-palette',
        order: 80,
        locale: NS,
      }, (props) => h(PaletteView, { ...props, ctx })));

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: PANEL_ID,
        order: 25,
        label: () => t('settings.nav'),
        locale: NS,
      }, (props) => h(Settings, { ...props, ctx, shortcuts })));

      ctx.slots.inject('conversation.user.text.node', () => ctx.slots.register({
        name: 'conversation.user.text.node',
        key: 'action-hub',
        priority: 120,
        locale: NS,
      }, ActionUserChip));
    }

    function PanelIcon(props) {
      const size = typeof props?.size === 'number' && props.size > 0 ? props.size : 16;
      return h('svg', {
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: 'false',
        style: { display: 'block' },
      },
      h('rect', { x: 2.4, y: 2.6, width: 11.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
      h('rect', { x: 2.4, y: 6.5, width: 11.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
      h('rect', { x: 2.4, y: 10.4, width: 7.2, height: 3.1, rx: 1.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }));
    }

    return {
      name: PKG,
      inject: ['slots', 'locale'],
      apply,
      internals: {
        expandPrompt,
        composeDraft,
        composeReferenceDraft,
        matchActionMarker,
        searchScore,
        sortActions,
        visibleActions,
        relativeTime,
        TEXT,
      },
    };
  },
});
