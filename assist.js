/**
 * dsh-action-hub — AI-assisted Skill import.
 *
 * The plugin cannot make the model call its HTTP API from inside a Skill import,
 * so this module sets up a small, user-visible conversation instead:
 *
 * 1. `prepareAssist` reads the chosen Skill, writes a conversion brief, and picks
 *    an inbox file path for the resulting JSON package.
 * 2. The client opens a fresh conversation with that brief. The user and the model
 *    agree on scope/arguments/resources; the model writes the package file.
 * 3. A Host watcher validates the package and imports it as an Action (plus its
 *    selected resource files), then removes the inbox file.
 *
 * Everything stays deterministic on the Host side: the model never gets write
 * access to the Action store, only to the one inbox JSON file it was told about.
 *
 * @module dsh-action-hub/assist
 */
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { addResourceFile, resourceDir } from './resources.js';
import { MAX_PROMPT, normalizeAction } from './store.js';

export const ASSIST_INBOX = 'inbox';
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 64;

/**
 * @param {string} dataDir
 * @returns {string}
 */
export function assistInboxDir(dataDir) {
  return path.join(dataDir, ASSIST_INBOX);
}

async function walkFiles(root, prefix = '', out = []) {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, prefix), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      await walkFiles(root, relative, out);
      continue;
    }
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    out.push(relative);
  }
  return out;
}

/**
 * Read the Skill directory and build the conversation brief. The model uses the
 * file tools itself for deeper files; the brief carries the body and manifest.
 *
 * @param {string} dataDir
 * @param {string} rawPath - Skill directory (or SKILL.md path).
 * @returns {Promise<{ token: string, skill: { name: string, path: string, files: Array<{ name: string, bytes: number }> }, inboxFile: string, prompt: string }>}
 */
export async function prepareAssist(dataDir, rawPath) {
  const candidate = path.resolve(String(rawPath));
  const stat = await fs.stat(candidate).catch(() => undefined);
  if (stat === undefined) throw new Error(`目录不存在：${rawPath}`);
  const skillPath = stat.isDirectory() ? path.join(candidate, 'SKILL.md') : candidate;
  const skillDir = stat.isDirectory() ? candidate : path.dirname(skillPath);
  const document = await fs.readFile(skillPath, 'utf8').catch(() => undefined);
  if (document === undefined) throw new Error(`没有找到 SKILL.md：${skillPath}`);
  const parsed = parseFrontmatter(document);
  const files = [];
  for (const name of await walkFiles(skillDir)) {
    if (name.toLowerCase() === 'skill.md') continue;
    const absolute = path.join(skillDir, ...name.split('/'));
    const size = await fs.stat(absolute).then((info) => info.size).catch(() => 0);
    files.push({ name, bytes: size });
  }
  const name = parsed.meta.name || path.basename(skillDir);
  const alternatives = await findAlternatives(skillDir, name);
  const token = randomUUID().replace(/-/g, '').slice(0, 16);
  const dir = assistInboxDir(dataDir);
  await fs.mkdir(dir, { recursive: true });
  const inboxFile = path.join(dir, `${token}.json`);
  const manifest = files.length === 0
    ? '（没有额外文件）'
    : files.map((file) => `- ${file.name} (${file.bytes} bytes)`).join('\n');
  const prompt = buildAssistPrompt({
    name,
    skillDir,
    skillPath,
    body: parsed.body,
    manifest,
    inboxFile,
    alternatives,
  });
  return { token, skill: { name, path: skillDir, files }, inboxFile, prompt, alternatives };
}

/**
 * Find same-named Skill directories in the usual roots so the model can compare
 * a thin shim with a richer copy instead of trusting the first resolution.
 *
 * @param {string} chosenDir
 * @param {string} name
 * @returns {Promise<Array<{ path: string, skillBytes: number, files: number }>>}
 */
async function findAlternatives(chosenDir, name) {
  const roots = new Set();
  const normalized = path.resolve(chosenDir);
  const marker = `${path.sep}skills${path.sep}`;
  const at = normalized.toLowerCase().indexOf(marker.toLowerCase());
  if (at > 0) {
    const sourceRoot = normalized.slice(0, at); // .../.agents or .../.claude
    const base = path.dirname(sourceRoot);
    const leaf = path.basename(sourceRoot).toLowerCase();
    const sibling = leaf === '.claude' ? '.agents' : '.claude';
    roots.add(path.join(base, sibling, 'skills', name));
  }
  for (const home of [os.homedir(), process.cwd()]) {
    roots.add(path.join(home, '.claude', 'skills', name));
    roots.add(path.join(home, '.agents', 'skills', name));
  }
  const out = [];
  for (const candidate of roots) {
    if (path.resolve(candidate) === normalized) continue;
    const skillFile = path.join(candidate, 'SKILL.md');
    const stat = await fs.stat(skillFile).catch(() => undefined);
    if (stat === undefined) continue;
    const files = (await walkFiles(candidate)).filter((file) => file.toLowerCase() !== 'skill.md').length;
    out.push({ path: candidate, skillBytes: stat.size, files });
  }
  return out;
}

function parseFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u.exec(content);
  if (match === null) return { meta: {}, body: content.trim() };
  const meta = {};
  for (const line of match[1].split(/\r?\n/u)) {
    const at = line.indexOf(':');
    if (at <= 0) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key !== '') meta[key] = value;
  }
  return { meta, body: content.slice(match[0].length).trim() };
}

function buildAssistPrompt(input) {
  const alternatives = Array.isArray(input.alternatives) && input.alternatives.length > 0
    ? [
      '',
      '## 同名候选目录（重要）',
      '同一个 Skill 名称在别的来源里还存在其它目录。请先比较它们的 SKILL.md 正文和文件，判断哪个才是用户想要的内容；如果差异明显，先向用户说明并询问选哪一个，不要默认相信当前目录。',
      ...input.alternatives.map((entry) => `- ${entry.path}（SKILL.md ${entry.skillBytes} bytes，${entry.files} 个文件）`),
    ].join('\n')
    : '';
  return [
    `你在帮用户把一个 DSH Skill 转换成 Action Hub 的 Action。请先读清楚再动手，必要时和用户对话确认。`,
    '',
    `## 输入 Skill`,
    `- 名称：${input.name}`,
    `- 目录：${input.skillDir}`,
    `- SKILL.md：${input.skillPath}`,
    alternatives,
    '',
    `### SKILL.md 正文`,
    '',
    input.body,
    '',
    `### Skill 目录里的其它文件`,
    '',
    input.manifest,
    '',
    '需要时请用文件工具读取这些文件的完整内容；目录外的文件不要引入。',
    '',
    '## 转换原则（Skill 与 Action 并不完全等价）',
    '- Action 只由用户显式调用，不注册 Skill、不自动触发；删除 SKILL.md 里关于模型主动调用的语义。',
    '- Action 的 prompt 应能独立指导执行；保留必要的步骤、引用和约束，去掉与 Skill 调度/工具注册相关的内容。',
    '- Action 支持 {{args}} / $ARGUMENTS 参数；如果 Skill 的使用方式依赖用户输入，可把它转成一个参数占位符，并在 argsHint 里提示。',
    '- 资源文件只选择真正需要的代码/模板/文档；name 用导入后的相对路径，path 用 Skill 目录内的绝对路径。',
    '- 如果 Skill 的正文和资源存在歧义（例如是否保留某个模板、参数如何命名、是否拆成多个 Action），先向用户提问，一次只问一个问题。',
    '',
    '## 交付方式（必须严格照做）',
    `完成并确认后，用文件工具把**唯一一个 JSON 文件**写到：`,
    `\`${input.inboxFile}\``,
    '',
    'JSON 结构：',
    '```json',
    '{',
    '  "action": {',
    '    "name": "Action 名称",',
    '    "description": "一句话说明",',
    '    "category": "分类（可选）",',
    '    "tags": ["skill"],',
    '    "argsHint": "参数提示（可选）",',
    '    "prompt": "转换后的完整提示词 Markdown"',
    '  },',
    '  "source": { "name": "原 Skill 名称", "path": "最终采用的 Skill 目录绝对路径" },',
    '  "resources": [',
    '    { "name": "相对文件名", "path": "Skill 目录内该文件的绝对路径" }',
    '  ],',
    '  "notes": "给用户看的简短说明（可选）"',
    '}',
    '```',
    '- JSON 必须是合法 UTF-8、不要包含注释或多余文字。',
    '- 每个 resource.path 必须位于 source.path 指向的 Skill 目录内；Host 会读取并复制。',
    `- 每个资源 ≤ ${MAX_FILE_BYTES / 1024 / 1024} MB，最多 ${MAX_FILES} 个。`,
    '- 写入成功后，简短告诉用户：Action Hub 会自动导入，无需再手动操作。',
    '- 如果写文件被环境拒绝，就把同样的 JSON 放在代码块里回复，并让用户在 Action Hub 的「导入 JSON」里粘贴；不要尝试写其它位置。',
  ].join('\n');
}

/**
 * Validate one package and import it as an Action plus resource files.
 *
 * @param {ReturnType<typeof import('./store.js').createStore>} store
 * @param {string} dataDir
 * @param {object} pkg
 * @returns {Promise<{ action: object, resources: Array<{ name: string, bytes: number }> }>}
 */
export async function importAssistPackage(store, dataDir, pkg) {
  if (pkg === null || typeof pkg !== 'object') throw new Error('导入包必须是 JSON 对象');
  const rawAction = pkg.action;
  if (rawAction === null || typeof rawAction !== 'object') throw new Error('导入包缺少 action');
  if (typeof rawAction.prompt !== 'string' || rawAction.prompt.trim() === '') throw new Error('Action 缺少 prompt');
  if (rawAction.prompt.length > MAX_PROMPT) throw new Error('Action prompt 过长');
  const source = pkg.source !== null && typeof pkg.source === 'object' ? pkg.source : {};
  if (typeof source.path !== 'string' || source.path.trim() === '') throw new Error('导入包缺少 source.path');
  const skillDir = path.resolve(source.path);
  const action = normalizeAction({
    ...rawAction,
    tags: Array.isArray(rawAction.tags) && rawAction.tags.length > 0 ? rawAction.tags : ['skill', 'ai'],
    source: {
      kind: 'skill',
      name: typeof source.name === 'string' ? source.name : '',
      detail: skillDir,
    },
  }, { now: Date.now() });
  const entries = Array.isArray(pkg.resources) ? pkg.resources.slice(0, MAX_FILES) : [];
  const dir = resourceDir(dataDir, action.id);
  let resources = [];
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object' || typeof entry.path !== 'string') continue;
    const absolute = path.resolve(entry.path);
    if (!absolute.startsWith(skillDir + path.sep)) continue;
    const info = await fs.stat(absolute).catch(() => undefined);
    if (info === undefined || !info.isFile() || info.size > MAX_FILE_BYTES) continue;
    const buffer = await fs.readFile(absolute).catch(() => undefined);
    if (buffer === undefined) continue;
    const name = typeof entry.name === 'string' && entry.name.trim() !== ''
      ? entry.name
      : path.basename(absolute);
    resources = await addResourceFile(dir, name, buffer, resources);
  }
  if (resources.length > 0) action.resources = resources;
  const { state } = await store.mutate((draft) => {
    draft.actions = [...draft.actions, action];
  });
  return { action, resources };
}

/**
 * Watch the inbox directory and import each valid package exactly once.
 *
 * @param {object} ctx
 * @param {ReturnType<typeof import('./store.js').createStore>} store
 * @param {string} dataDir
 * @returns {() => void} dispose
 */
export function startAssistWatcher(ctx, store, dataDir) {
  const dir = assistInboxDir(dataDir);
  let stopped = false;
  let running = false;
  const timer = setInterval(() => {
    if (!running && !stopped) {
      running = true;
      void scan();
    }
  }, 1500);
  timer.unref?.();

  async function scan() {
    try {
      await fs.mkdir(dir, { recursive: true });
      const names = await fs.readdir(dir).catch(() => []);
      for (const name of names) {
        if (stopped || !name.endsWith('.json')) continue;
        const file = path.join(dir, name);
        let pkg;
        try {
          pkg = JSON.parse(await fs.readFile(file, 'utf8'));
        } catch {
          continue; // still being written, or invalid: wait for a stable valid file
        }
        try {
          await importAssistPackage(store, dataDir, pkg);
          await fs.unlink(file).catch(() => undefined);
          ctx.logger?.info?.(`dsh-action-hub: AI-assisted import finished (${name})`);
        } catch (error) {
          ctx.logger?.warn?.(`dsh-action-hub: AI import package rejected: ${describe(error)}`);
          await fs.rename(file, `${file}.error`).catch(() => undefined);
        }
      }
    } finally {
      running = false;
    }
  }

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}
