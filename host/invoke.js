/**
 * User-invoked Action expansion for referenced chips.
 *
 * @module dsh-action-hub/host/invoke
 */
import { readInvocationResources } from '../resources.js';
import { planActionRefs, referencedActions, actionInvocationMessage } from './refs.js';
import { actionResourceDir, readAll } from './state.js';

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Install the user-invoked Action expander. A `/ah-…` marker in a direct user
 * message becomes an `<action_content>` message for the model; the durable log
 * still holds the marker, so the transcript can show only the Action name.
 *
 * @param {object} ctx
 * @param {ReturnType<import('../store.js').createStore>} store
 * @param {string} dataDir
 */
export function installActionInvocations(ctx, store, dataDir) {
  return ctx.on('agent/pre-step', async ({ messages, signal }, next) => {
    const decision = await next();
    if (decision.kind === 'reject' || signal.aborted) return decision;
    const direct = messages.filter((message) => message?.source?.kind === 'user');
    if (direct.length === 0) return decision;
    const hasMarker = direct.some((message) => (message.content ?? []).some(
      (block) => block?.type === 'text' && typeof block.text === 'string' && /(^|\s)\/ah-[0-9a-f]{10}(?![0-9a-f])/.test(block.text),
    ));
    if (!hasMarker) return decision;
    let plan;
    try {
      const { actions } = await readAll(store, dataDir);
      plan = planActionRefs(actions);
    } catch (error) {
      ctx.logger?.warn?.(`dsh-action-hub: could not read Actions for an invocation: ${describe(error)}`);
      return decision;
    }
    const byHandle = new Map(plan.entries.map((entry) => [entry.name, entry.action]));
    const markers = referencedActions(messages, new Set(byHandle.keys()));
    if (markers.length === 0) return decision;
    const injections = await Promise.all(markers.map(async (marker) => {
      const action = byHandle.get(marker);
      const context = await readInvocationResources(dataDir, action, actionResourceDir(action, dataDir));
      return actionInvocationMessage(action, context);
    }));
    return {
      ...decision,
      messages: [...decision.messages, ...injections],
    };
  });
}
