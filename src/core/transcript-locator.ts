import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECTS_DIR } from './config';

// The project folder name does not reliably derive from the session cwd, so search by session id.
export class TranscriptLocator {
  private readonly found: Map<string, string> = new Map();

  async locate(sessionId: string): Promise<string | null> {
    const cached: string | undefined = this.found.get(sessionId);
    if (cached !== undefined) return cached;
    const path: string | null = await this.search(sessionId);
    if (path !== null) this.found.set(sessionId, path);
    return path;
  }

  private async search(sessionId: string): Promise<string | null> {
    for (const project of await readdir(PROJECTS_DIR)) {
      const candidate: string = join(PROJECTS_DIR, project, `${sessionId}.jsonl`);
      if (await exists(candidate)) return candidate;
    }
    return null;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
