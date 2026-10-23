/**
 * dsh-action-hub — Client half (Web UI).
 *
 * Product surfaces:
 *   - `conversation.input.left`: a compact "Actions" trigger in the composer tool row.
 *   - `conversation.input.overlay`: a session bridge that hands the palette the
 *     live composer facade (inputActions / input state) it needs to insert text.
 *   - `shell.overlay`: the Spotlight-style palette (Alt+A / ⌥+A), rendered at
 *     the frame level so it is never clipped by the composer card.
 *   - `main` + `sidebar.panellist`: the management library.
 *   - `settings.section`: preferences and data controls.
 *
 * Nothing here registers a tool or prompt section: an Action reaches a model
 * only through a user action in this UI.
 */
window.__ModuleLoader__.load({
  id: 'dsh-action-hub',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'action-hub';
    const PANEL_ID = 'dsh-action-hub';
    const API = '/api/dsh-action-hub';
    const PKG = 'dsh-action-hub';
    const VERSION = '7.5.0';
    const PREFS_KEY = 'dsh-action-hub/prefs';
    const ARG_TOKENS = ['{{args}}', '{{ARGS}}', '$ARGUMENTS', '{{input}}'];
    const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
