/**
 * dsh-action-hub — standard Agent Skill (`SKILL.md`) parsing and writing.
 *
 * The skill directory is the portable artifact: `SKILL.md` plus sibling
 * resources. This module never invents fields inside the document; plugin-only
 * state lives in `state.json` outside the skill directory.
 *
 * @module dsh-action-hub/skill-doc
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import YAML from 'yaml';

export const SKILL_FILE = 'SKILL.md';
export const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_DESCRIPTION = 500;
export const MAX_BODY = 200_000;

const RESERVED_ROOT_FILES = new Set(['SKILL.md', 'state.json', '.git']);

/** Return whether a name is a portable skill name. */
export function isSkillName(value) {
  return typeof value === 'string' && SKILL_NAME_RE.test(value);
}

/** Quote/normalize a skill name, or throw. */
export function assertSkillName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!isSkillName(name)) {
    throw new Error('技能名必须是 kebab-case（小写字母、数字、连字符），例如 code-review');
  }
  return name;
}

/**
 * Split a SKILL.md document into frontmatter and body.
 *
 * @param {string} text
 * @returns {{ frontmatter: Record<string, unknown>, body: string, raw: string, hasFrontmatter: boolean, error: string }}
 */
export function parseSkillText(text) {
  const source = typeof text === 'string' ? text.replace(/^\uFEFF/u, '') : '';
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u.exec(source);
  if (match === null) {
    return { frontmatter: {}, body: source.trim(), raw: '', hasFrontmatter: false, error: '缺少 YAML frontmatter' };
  }
  try {
    const parsed = YAML.parse(match[1]);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { frontmatter: {}, body: source.slice(match[0].length).trim(), raw: match[1], hasFrontmatter: true, error: 'frontmatter 必须是 YAML 映射' };
    }
    return {
      frontmatter: parsed,
      body: source.slice(match[0].length).trim(),
      raw: match[1],
      hasFrontmatter: true,
      error: '',
    };
  } catch (error) {
    return {
      frontmatter: {},
      body: source.slice(match[0].length).trim(),
      raw: match[1],
      hasFrontmatter: true,
      error: `frontmatter YAML 解析失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Read and validate one skill directory.
 *
 * @param {string} dir
 * @returns {Promise<{ dir: string, name: string, description: string, body: string, frontmatter: Record<string, unknown>, files: string[], fingerprint: string, error: string }>}
 */
export async function readSkillDir(dir) {
  const file = path.join(dir, SKILL_FILE);
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (error) {
    return { dir, name: '', description: '', body: '', frontmatter: {}, files: [], fingerprint: '', error: error.code === 'ENOENT' ? '缺少 SKILL.md' : describe(error) };
  }
  const doc = parseSkillText(text);
  if (doc.error !== '') return { dir, name: '', description: '', body: '', frontmatter: {}, files: [], fingerprint: '', error: doc.error };
  const name = typeof doc.frontmatter.name === 'string' ? doc.frontmatter.name.trim() : '';
  const description = typeof doc.frontmatter.description === 'string' ? doc.frontmatter.description.trim() : '';
  if (!isSkillName(name)) {
    return { dir, name, description, body: doc.body, frontmatter: doc.frontmatter, files: [], fingerprint: '', error: 'SKILL.md 缺少合法的 name（kebab-case）' };
  }
  if (description === '') {
    return { dir, name, description, body: doc.body, frontmatter: doc.frontmatter, files: [], fingerprint: '', error: 'SKILL.md 缺少非空 description' };
  }
  if (doc.body === '') {
    return { dir, name, description, body: doc.body, frontmatter: doc.frontmatter, files: [], fingerprint: '', error: 'SKILL.md 正文为空' };
  }
  const files = await listFiles(dir);
  const fingerprint = await fingerprintDir(dir, [SKILL_FILE, ...files]);
  return { dir, name, description, body: doc.body, frontmatter: doc.frontmatter, files, fingerprint, error: '' };
}

/**
 * Write a skill document, preserving unknown frontmatter keys.
 *
 * @param {string} dir
 * @param {{ name: string, description: string, body: string, frontmatter?: Record<string, unknown> }} input
 */
export async function writeSkillDir(dir, input) {
  const name = assertSkillName(input.name);
  const description = String(input.description ?? '').trim();
  if (description === '') throw new Error('描述不能为空');
  const body = String(input.body ?? '').trim();
  if (body === '') throw new Error('正文不能为空');
  const frontmatter = { ...(input.frontmatter ?? {}), name, description };
  const text = `---\n${YAML.stringify(frontmatter).trimEnd()}\n---\n\n${body}\n`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, SKILL_FILE), text, 'utf8');
  return { name, description, body };
}

/** List regular files under a skill directory, relative with `/`. */
export async function listFiles(root, prefix = '', out = []) {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, prefix), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (prefix === '' && RESERVED_ROOT_FILES.has(entry.name)) continue;
    if (entry.name.startsWith('.') && prefix === '') continue;
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      await listFiles(root, relative, out);
    } else if (entry.isFile()) {
      out.push(relative);
    }
  }
  return out;
}

/** Hash the standard document and all resources. */
export async function fingerprintDir(root, files = null) {
  const hash = createHash('sha256');
  const entries = [...(files ?? await listFiles(root))].sort();
  for (const relative of entries) {
    hash.update('\0');
    hash.update(relative);
    hash.update('\0');
    try {
      hash.update(await fs.readFile(path.join(root, relative)));
    } catch {
      hash.update('<unreadable>');
    }
  }
  return `sha256:${hash.digest('hex')}`;
}

/** Build a stable id from a skill name. */
export function skillHandle(name) {
  return `ah-${createHash('sha1').update(String(name)).digest('hex').slice(0, 10)}`;
}

/** Format a resource list for the model. */
export function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}
