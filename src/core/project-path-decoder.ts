import { readdir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';

const ENCODED_SEPARATOR: string = '-';

// Claude Code names project folders by replacing every non-alphanumeric path character with '-'.
export function encodeProjectPath(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, ENCODED_SEPARATOR);
}

// The encoding is lossy ('-', '_', ' ' and '/' all collapse), so walk the real filesystem to undo it.
export async function decodeProjectDir(encoded: string): Promise<string | null> {
  return walk('/', encoded.slice(ENCODED_SEPARATOR.length));
}

async function walk(directory: string, remaining: string): Promise<string | null> {
  if (remaining.length === 0) return directory;
  for (const child of await listDirectories(directory)) {
    const encodedChild: string = encodeProjectPath(child);
    if (remaining === encodedChild) return join(directory, child);
    if (!remaining.startsWith(`${encodedChild}${ENCODED_SEPARATOR}`)) continue;
    const found: string | null = await walk(join(directory, child), remaining.slice(encodedChild.length + 1));
    if (found !== null) return found;
  }
  return null;
}

async function listDirectories(directory: string): Promise<string[]> {
  try {
    const entries: Dirent[] = await readdir(directory, { withFileTypes: true });
    return entries.filter((entry: Dirent) => entry.isDirectory()).map((entry: Dirent) => entry.name);
  } catch {
    return [];
  }
}
