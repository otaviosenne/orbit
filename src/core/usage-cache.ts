import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { UsageSnapshot } from '../shared/types';

// The last good reading survives restarts, so a rate-limited endpoint never leaves the top bar empty.
const CACHE_FILE: string = join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'orbit', 'usage.json');

export async function loadCachedUsage(): Promise<UsageSnapshot | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(CACHE_FILE, 'utf8'));
    return isSnapshot(parsed) ? { ...parsed, error: null } : null;
  } catch {
    return null;
  }
}

export async function saveCachedUsage(snapshot: UsageSnapshot): Promise<void> {
  try {
    await mkdir(dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(snapshot));
  } catch {
    // A cache that cannot be written only costs the next restart its head start.
  }
}

function isSnapshot(value: unknown): value is UsageSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: Record<string, unknown> = value as Record<string, unknown>;
  return Array.isArray(candidate['limits']) && Array.isArray(candidate['breakdown']) && typeof candidate['fetchedAt'] === 'number';
}
