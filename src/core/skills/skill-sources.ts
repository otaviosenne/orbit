import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { SkillSource } from '../../shared/types';
import { CLAUDE_DIR } from '../config';

// A folder of <skill>/SKILL.md entries; plugin skills are called with their plugin's name in front.
export interface SkillFolder {
  readonly path: string;
  readonly source: SkillSource;
  readonly prefix: string | null;
}

interface PluginInstall {
  readonly installPath?: string;
}

type PluginEntry = [key: string, installs: readonly PluginInstall[]];

interface InstalledPlugins {
  readonly plugins?: Readonly<Record<string, readonly PluginInstall[]>>;
}

interface UserSettings {
  readonly enabledPlugins?: Readonly<Record<string, boolean>>;
}

interface PluginManifest {
  readonly name?: string;
}

const SKILLS_DIR_NAME: string = 'skills';
const PROJECT_CONFIG_DIR: string = '.claude';
const INSTALLED_PLUGINS_FILE: string = join(CLAUDE_DIR, 'plugins', 'installed_plugins.json');
const USER_SETTINGS_FILE: string = join(CLAUDE_DIR, 'settings.json');
const PLUGIN_MANIFEST: string = join('.claude-plugin', 'plugin.json');
// Installed plugins are keyed "<plugin>@<marketplace>".
const MARKETPLACE_SEPARATOR: string = '@';

// Nearest first, so a project's own skill wins over a same-named one further out.
export async function skillFolders(cwd: string): Promise<SkillFolder[]> {
  return [...projectFolders(cwd), { path: join(CLAUDE_DIR, SKILLS_DIR_NAME), source: 'user', prefix: null }, ...(await pluginFolders())];
}

// Claude Code reads .claude/skills in the chat's folder and every folder above it; the home folder's is the user's own.
function projectFolders(cwd: string): SkillFolder[] {
  const home: string = homedir();
  const folders: SkillFolder[] = [];
  for (let dir: string = cwd; ; dir = dirname(dir)) {
    if (dir !== home) folders.push({ path: join(dir, PROJECT_CONFIG_DIR, SKILLS_DIR_NAME), source: 'project', prefix: null });
    if (dirname(dir) === dir) return folders;
  }
}

async function pluginFolders(): Promise<SkillFolder[]> {
  const installed: InstalledPlugins | null = await readJson<InstalledPlugins>(INSTALLED_PLUGINS_FILE);
  const enabled: Readonly<Record<string, boolean>> = (await readJson<UserSettings>(USER_SETTINGS_FILE))?.enabledPlugins ?? {};
  const entries: PluginEntry[] = Object.entries(installed?.plugins ?? {});
  const folders: (SkillFolder | null)[] = await Promise.all(
    entries
      .filter(([key]: PluginEntry) => enabled[key] === true)
      .flatMap(([key, installs]: PluginEntry) => installs.map((install: PluginInstall) => pluginFolder(key, install))),
  );
  return folders.filter((folder: SkillFolder | null): folder is SkillFolder => folder !== null);
}

async function pluginFolder(key: string, install: PluginInstall): Promise<SkillFolder | null> {
  if (install.installPath === undefined) return null;
  const manifest: PluginManifest | null = await readJson<PluginManifest>(join(install.installPath, PLUGIN_MANIFEST));
  const name: string = manifest?.name ?? key.split(MARKETPLACE_SEPARATOR)[0] ?? key;
  return { path: join(install.installPath, SKILLS_DIR_NAME), source: 'plugin', prefix: name };
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}
