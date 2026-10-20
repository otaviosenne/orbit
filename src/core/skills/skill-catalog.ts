import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SkillEntry } from '../../shared/types';
import type { Frontmatter } from './skill-frontmatter';
import { parseFrontmatter } from './skill-frontmatter';
import type { SkillFolder } from './skill-sources';
import { skillFolders } from './skill-sources';

const SKILL_FILE: string = 'SKILL.md';
// A skill marked this way is only for Claude to call, so there is no /<name> for the user to type.
const USER_INVOCABLE_KEY: string = 'user-invocable';
const NOT_INVOCABLE: string = 'false';

// Every skill the chat in that folder can run, each name once (the nearest folder's wins), sorted by name.
export async function listSkills(cwd: string): Promise<SkillEntry[]> {
  const found: SkillEntry[][] = await Promise.all((await skillFolders(cwd)).map(readFolder));
  const byName: Map<string, SkillEntry> = new Map();
  for (const skill of found.flat()) if (!byName.has(skill.name)) byName.set(skill.name, skill);
  return [...byName.values()].sort((a: SkillEntry, b: SkillEntry) => a.name.localeCompare(b.name));
}

async function readFolder(folder: SkillFolder): Promise<SkillEntry[]> {
  const entries: Dirent[] = await readdir(folder.path, { withFileTypes: true }).catch((): Dirent[] => []);
  const skills: (SkillEntry | null)[] = await Promise.all(
    entries.filter((entry: Dirent) => entry.isDirectory() || entry.isSymbolicLink()).map((entry: Dirent) => readSkill(folder, entry.name)),
  );
  return skills.filter((skill: SkillEntry | null): skill is SkillEntry => skill !== null);
}

async function readSkill(folder: SkillFolder, directory: string): Promise<SkillEntry | null> {
  const markdown: string | null = await readFile(join(folder.path, directory, SKILL_FILE), 'utf8').catch((): null => null);
  if (markdown === null) return null;
  const header: Frontmatter = parseFrontmatter(markdown);
  if (header.get(USER_INVOCABLE_KEY) === NOT_INVOCABLE) return null;
  const name: string = header.get('name') || directory;
  return {
    name: folder.prefix === null ? name : `${folder.prefix}:${name}`,
    description: header.get('description') ?? '',
    source: folder.source,
  };
}
