import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, dirname, relative } from 'node:path';
import { promisify } from 'node:util';
import type { Repository } from '../shared/types';
import { PROJECTS_DIR } from './config';
import { decodeProjectDir } from './project-path-decoder';

const run = promisify(execFile);

// Whole-disk backup repos: every project lives inside them, so they say nothing about which project a chat is in.
const UMBRELLA_REPOS: readonly string[] = ['/HD', homedir()];

export class RepositoryResolver {
  private readonly cache: Map<string, Promise<Repository>> = new Map();

  resolve(cwd: string): Promise<Repository> {
    const cached: Promise<Repository> | undefined = this.cache.get(cwd);
    if (cached !== undefined) return cached;
    const resolved: Promise<Repository> = resolveRepository(cwd);
    this.cache.set(cwd, resolved);
    return resolved;
  }
}

async function resolveRepository(cwd: string): Promise<Repository> {
  const workingDirectory: string = (await projectDirectoryOf(cwd)) ?? cwd;
  const gitRoot: string | null = await gitTopLevel(workingDirectory);
  const root: string = gitRoot === null || UMBRELLA_REPOS.includes(gitRoot) ? workingDirectory : gitRoot;
  return { name: basename(root), root };
}

// Some chats are started from their transcript folder (~/.claude/projects/<encoded path>); map those back.
async function projectDirectoryOf(cwd: string): Promise<string | null> {
  if (dirname(cwd) !== PROJECTS_DIR) return null;
  return decodeProjectDir(relative(PROJECTS_DIR, cwd));
}

async function gitTopLevel(directory: string): Promise<string | null> {
  try {
    const { stdout } = await run('git', ['-C', directory, 'rev-parse', '--show-toplevel']);
    return stdout.trim();
  } catch {
    return null;
  }
}
