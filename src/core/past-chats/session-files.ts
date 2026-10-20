import { readdir, stat } from 'node:fs/promises';
import type { Dirent, Stats } from 'node:fs';
import { basename, join } from 'node:path';
import { isSessionId } from '../../shared/session-id';
import { PROJECTS_DIR } from '../config';

export interface SessionFile {
  readonly sessionId: string;
  readonly path: string;
  readonly projectDir: string;
  readonly modifiedAt: number;
  readonly sizeBytes: number;
}

const TRANSCRIPT_SUFFIX: string = '.jsonl';

// Only a project folder's top-level transcripts are chats; subagent runs live in subfolders.
export async function listSessionFiles(): Promise<SessionFile[]> {
  const projects: string[] = await listDirectories(PROJECTS_DIR);
  const perProject: SessionFile[][] = await Promise.all(projects.map((project: string) => listProjectSessions(join(PROJECTS_DIR, project))));
  return perProject.flat();
}

async function listProjectSessions(projectDir: string): Promise<SessionFile[]> {
  const entries: Dirent[] = await readEntries(projectDir);
  const paths: string[] = entries
    .filter((entry: Dirent) => entry.isFile() && isSessionId(basename(entry.name, TRANSCRIPT_SUFFIX)) && entry.name.endsWith(TRANSCRIPT_SUFFIX))
    .map((entry: Dirent) => join(projectDir, entry.name));
  const files: (SessionFile | null)[] = await Promise.all(paths.map((path: string) => describe(path, projectDir)));
  return files.filter((file: SessionFile | null): file is SessionFile => file !== null);
}

// A transcript can be deleted between listing its folder and reading it.
async function describe(path: string, projectDir: string): Promise<SessionFile | null> {
  try {
    const stats: Stats = await stat(path);
    return { sessionId: basename(path, TRANSCRIPT_SUFFIX), path, projectDir, modifiedAt: stats.mtimeMs, sizeBytes: stats.size };
  } catch {
    return null;
  }
}

async function listDirectories(directory: string): Promise<string[]> {
  return (await readEntries(directory)).filter((entry: Dirent) => entry.isDirectory()).map((entry: Dirent) => entry.name);
}

async function readEntries(directory: string): Promise<Dirent[]> {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}
