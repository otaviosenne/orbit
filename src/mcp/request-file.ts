import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

// Written whole and then renamed, so Orbit never reads half a request.
export async function saveRequestFile(path: string, request: object): Promise<void> {
  const draft: string = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(draft, JSON.stringify(request));
  await rename(draft, path);
}

export function currentSessionId(): string | null {
  return process.env['CLAUDE_CODE_SESSION_ID'] ?? null;
}
