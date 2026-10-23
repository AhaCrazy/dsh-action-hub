import { readSkillDir } from '../skill-doc.js';
import { scopeAllows, resolveProjectRoot } from './scope.js';
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

export function installSkillsProvider(ctx, store) {
  const make = (providerControl) => {
    control = providerControl;
    return {
      name: PROVIDER,
      async list(options = {}) {
        const { actions } = await readAll(store);
        const root = await resolveProjectRoot(options.cwd);
        const candidates = [];
        for (const action of actions) {
          if (action.mode !== 'skill') continue;
          if (!scopeAllows(action.scope, root)) continue;
          candidates.push({
            name: action.name,
            description: action.description.slice(0, 500),
            invocation: { modelInvocable: true, userInvocable: true },
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
        const { actions } = await readAll(store);
        const root = await resolveProjectRoot(options.cwd);
        const action = actions.find((entry) => entry.name === target.name && entry.mode === 'skill');
        if (action === undefined || !scopeAllows(action.scope, root)) return undefined;
        const skill = await readSkillDir(action.dir);
        if (skill.error !== '' || skill.name !== target.name) return undefined;
        return {
          name: skill.name,
          description: skill.description,
          content: skill.body,
          provider: PROVIDER,
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
