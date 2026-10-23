# Web client fragments

`client.js` is generated: DSH loads exactly one
`window.__ModuleLoader__.load({ id, factory })` bundle, and the factory can only
`require('react')`. To keep files small, the factory body is split into ordered
fragments that share one scope:

| File | Responsibility |
| --- | --- |
| `00-header.js` | loader wrapper, constants, `React.createElement` |
| `10-css.js` | injected stylesheet |
| `20-i18n.js` | Chinese/English dictionaries |
| `30-helpers.js` | pure helpers: prompt expansion, references, search, sorting |
| `40-stores.js` | hub API store, preferences |
| `50-shortcuts.js` | shortcut bindings, registry glue, global key listener |
| `55-reference-source.js` | `/` reference source, action chips, marker matching |
| `60-ui.js` | icons and primitive components |
| `70-page.js` | library row and resource tree |
| `75-dialogs.js` | editor, import, export, category dialogs |
| `76-library-view.js` | library page shell, filters, sorting controls |
| `80-palette.js` | Spotlight palette view |
| `85-session.js` | palette state, session bridge, composer trigger |
| `90-settings.js` | settings page |
| `99-apply.js` | Cordis `apply`, registrations, public return |

Edit the smallest fragment that owns the behavior, then regenerate:

```sh
npm run build
```

For iterative work keep the watcher running:

```sh
npm run dev
```

`npm test` runs the build automatically via `pretest`. Do not edit `client.js`
directly; it is overwritten.
