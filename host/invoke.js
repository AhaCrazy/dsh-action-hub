/**
 * User-invoked Command expansion for referenced chips.
 *
 * @module dsh-action-hub/host/invoke
 */
import { readInvocationResources } from '../resources.js';
import { planActionRefs, referencedActions, actionInvocationMessage } from './refs.js';
import { actionResourceDir, readAll } from './state.js';
import { resolveProjectRoot, scopeAllows } from './scope.js';

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

async function workingCwd(ctx, agent, signal) {
  try {
    const service = ctx.get?.('workingDirectory');
    if (service !== undefined && typeof service.ensure === 'function') return await service.ensure(agent, signal);
  } catch {
    /* fail closed below */
  }
  return undefined;
}

export function installActionInvocations(ctx, store) {
  return ctx.on('agent/pre-step', async ({ agent, messages, signal }, next) => {
    const decision = await next();
    if (decision.kind === 'reject' || signal.aborted) return decision;
    const direct = messages.filter((message) => message?.source?.kind === 'user');
    if (direct.length === 0) return decision;
    const hasMarker = direct.some((message) => (message.content ?? []).some(
      (block) => block?.type === 'text' && typeof block.text === 'string' && /(^|\s)\/ah-[0-9a-f]{10}(?![0-9a-f])/.test(block.text),
    ));
    if (!hasMarker) return decision;
    let actions;
    try {
      actions = (await readAll(store)).actions;
    } catch (error) {
      ctx.logger?.warn?.(`dsh-action-hub: could not read skills for an invocation: ${describe(error)}`);
      return decision;
    }
    const plan = planActionRefs(actions);
    const byHandle = new Map(plan.entries.map((entry) => [entry.name, entry.action]));
    const markers = referencedActions(messages, new Set(byHandle.keys()));
    if (markers.length === 0) return decision;
    const cwd = await workingCwd(ctx, agent, signal);
    const root = await resolveProjectRoot(cwd);
    const injections = [];
    const notices = new Map();
    for (const marker of markers) {
      const action = byHandle.get(marker);
      if (action === undefined) continue;
      if (action.mode !== 'command') {
        notices.set(marker, `「${action.name}」当前是 Skill 模式；请用 /${action.name} 调用，本次未注入正文。`);
        continue;
      }
      if (!scopeAllows(action.scope, root)) {
        notices.set(marker, `「${action.name}」不属于当前项目，本次未注入正文。`);
        continue;
      }
      const context = await readInvocationResources(store.dataDir, action, actionResourceDir(action));
      injections.push(actionInvocationMessage(action, context));
    }
    let nextMessages = decision.messages;
    if (notices.size > 0) {
      nextMessages = nextMessages.map((message) => {
        if (message?.source?.kind !== 'user') return message;
        const content = (message.content ?? []).map((block) => {
          if (block?.type !== 'text' || typeof block.text !== 'string') return block;
          let text = block.text;
          for (const [marker, notice] of notices) text = text.split(`/${marker}`).join(notice);
          return { ...block, text };
        });
        return { ...message, content };
      });
    }
    return { ...decision, messages: [...nextMessages, ...injections] };
  });
}
