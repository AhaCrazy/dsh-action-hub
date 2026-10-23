/**
 * Stable Action reference handles and the model-facing injection message.
 *
 * @module dsh-action-hub/host/refs
 */
import { createHash } from 'node:crypto';

import { expandPrompt } from '../store.js';

const ACTION_PREFIX = 'ah-';
const MARKER_PATTERN = /(^|\s)\/(ah-[0-9a-f]{10})(?![0-9a-f])/gu;

/**
 * Stable, opaque reference marker for one Action. The id survives renames, so
 * a marker already sitting in a draft keeps resolving.
 *
 * @param {string} id
 * @returns {string}
 */
function actionMarker(id) {
  return `${ACTION_PREFIX}${createHash('sha1').update(String(id)).digest('hex').slice(0, 10)}`;
}

/**
 * Map every Action to the opaque `/ah-…` marker that references it. The hash is
 * intentionally not the display name: the transcript chip shows the Action name,
 * while this handle is only the wire spelling.
 *
 * @param {readonly object[]} actions
 * @returns {{ handles: Map<string, string>, entries: Array<{ action: object, name: string }> }}
 */
export function planActionRefs(actions) {
  const used = new Set();
  const handles = new Map();
  const entries = [];
  for (const action of actions) {
    let name = actionMarker(action.id);
    let suffix = 2;
    while (used.has(name)) name = `${actionMarker(action.id)}-${suffix++}`;
    used.add(name);
    handles.set(action.id, name);
    entries.push({ action, name });
  }
  return { handles, entries };
}

/**
 * Collect the references a claimed batch of direct user messages carries.
 * Only `source.kind === 'user'` text is scanned, so injected context can never
 * forge an invocation.
 *
 * @param {readonly object[]} messages
 * @param {ReadonlySet<string>} known - markers that resolve to an existing Action.
 * @returns {string[]} unique markers, in first-seen order.
 */
export function referencedActions(messages, known) {
  const found = [];
  for (const message of messages) {
    if (message?.role !== 'user' || message.source?.kind !== 'user') continue;
    for (const block of Array.isArray(message.content) ? message.content : []) {
      if (block?.type !== 'text' || typeof block.text !== 'string') continue;
      for (const match of block.text.matchAll(MARKER_PATTERN)) {
        const marker = match[2];
        if (marker !== undefined && known.has(marker) && !found.includes(marker)) found.push(marker);
      }
    }
  }
  return found;
}

/**
 * Build the durable, model-facing injection for one explicitly invoked Action.
 * It is appended to the step like a Skill invocation, so later steps keep it in
 * history, but it uses our own source kind — Action references are not Skills
 * and never appear in the Skill catalog or the `/` menu. Small text resources
 * are inlined; everything else is listed by path for on-demand reads.
 *
 * @param {object} action
 * @param {{ basePath?: string, files?: Array<{ name: string, bytes: number, text?: string, path: string }> }} [context]
 * @returns {object} a plain user-role message.
 */
export function actionInvocationMessage(action, context = undefined) {
  const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const name = escape(action.name);
  const body = expandPrompt(action.prompt, { date: new Date() });
  const files = Array.isArray(context?.files) ? context.files : [];
  const parts = [`<action_content name="${name}">`];
  if (files.length > 0) {
    parts.push(`<action_resources base="${escape(context.basePath ?? '')}">`);
    for (const file of files) {
      if (typeof file.text === 'string') {
        parts.push(`<action_file name="${escape(file.name)}">\n${file.text}\n</action_file>`);
      } else {
        parts.push(`<action_file name="${escape(file.name)}" path="${escape(file.path)}" bytes="${file.bytes}"/>`);
      }
    }
    parts.push('</action_resources>');
    parts.push('The files above are local resources for this Action. Read any file you need with the file tools before applying it.');
  }
  parts.push('<action_instructions>', body, '</action_instructions>', '</action_content>');
  return {
    id: `action-${globalThis.crypto.randomUUID()}`,
    role: 'user',
    content: [{ type: 'text', text: parts.join('\n') }],
    source: { kind: 'action', name: action.name, form: 'instructions' },
  };
}
