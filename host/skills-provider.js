import { readSkillDir } from '../skill-doc.js';
import { resolveProjectRoot } from './scope.js';
import { listProjects } from './projects.js';
import { actionAvailable, profileFor } from './availability.js';
import { readAll } from './state.js';

const PROVIDER = 'action-hub';
let control = null;

export function invalidateSkills() {
  try {
    control?.invalidate?.();
  } catch {
    /* provider teardown */
  }
}

/**
 * Invalidate the provider cache and wake the Web `/` skill menu. DSH caches the
 * client-side skill catalog until an agent-preset event (or reconnect), so a
 * mode/scope change otherwise stays invisible until a reload.
 */
export function notifySkillCatalog(ctx) {
  invalidateSkills();
  try {
    if (typeof ctx.emit === 'function') ctx.emit('commands/change');
  } catch {
    /* older host */
  }
  try {
    const sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : undefined;
    const list = sessions !== null && typeof sessions?.list === 'function' ? sessions.list() : [];
    for (const session of Array.isArray(list) ? list : []) {
      const id = session?.id ?? session?.header?.id;
      const preset = typeof session?.header?.agentPreset === 'string' ? session.header.agentPreset : '';
      if (id !== undefined && preset !== '' && typeof ctx.emit === 'function') ctx.emit('agent-preset/selected', id, preset);
    }
  } catch {
    /* best effort */
  }
}

export function installSkillsProvider(ctx, store) {
  const make = (providerControl) => {
    control = providerControl;
    return {
      name: PROVIDER,
      async list(options = {}) {
        const { actions, projects, groups, defaultGroup } = await readAll(store);
        const root = await resolveProjectRoot(options.cwd, await listProjects(ctx));
        const profile = profileFor(projects, root, defaultGroup);
        const candidates = [];
        for (const action of actions) {
          if (action.mode !== 'skill') continue;
          if (!actionAvailable(action, profile, groups)) continue;
          candidates.push({
            name: action.name,
            description: action.description.slice(0, 500),
            // Keep Action Hub entries out of the native `/` menu. They remain
            // model-invocable, and the user reaches them through Alt+A.
            invocation: { modelInvocable: true, userInvocable: false },
            source: PROVIDER,
            provider: PROVIDER,
            rank: 250,
            path: action.dir,
            resourceBase: { kind: 'directory', path: action.dir },
            locator: { name: action.name, dir: action.dir },
          });
        }
        return { candidates, complete: true };
      },
      async get(target, options = {}) {
        if (target === null || typeof target !== 'object' || typeof target.name !== 'string') return undefined;
        const { actions, projects, groups, defaultGroup } = await readAll(store);
        const root = await resolveProjectRoot(options.cwd, await listProjects(ctx));
        const profile = profileFor(projects, root, defaultGroup);
        const action = actions.find((entry) => entry.name === target.name && entry.mode === 'skill');
        if (action === undefined || !actionAvailable(action, profile, groups)) return undefined;
        const skill = await readSkillDir(action.dir);
        if (skill.error !== '' || skill.name !== target.name) return undefined;
        return {
          name: skill.name,
          description: skill.description,
          content: skill.body,
          source: PROVIDER,
          provider: PROVIDER,
          invocation: { modelInvocable: true, userInvocable: false },
          path: skill.dir,
          resourceBase: { kind: 'directory', path: skill.dir },
        };
      },
    };
  };

  const register = (scopeCtx) => {
    scopeCtx.effect(() => scopeCtx.skills.registerProvider(make), 'action-hub: skill provider');
  };
  if (typeof ctx.inject === 'function') {
    ctx.inject(['skills'], register);
  } else if (typeof ctx.get === 'function' && ctx.get('skills') !== undefined) {
    register(ctx);
  }
}
