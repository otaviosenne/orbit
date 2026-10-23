import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { UsageSample } from '../shared/types';

// Kept as data, not cache, so it is never cleaned away: the endpoint has no past to ask for, so a lost reading is lost.
const HISTORY_FILE: string = join(process.env['XDG_DATA_HOME'] ?? join(homedir(), '.local', 'share'), 'orbit', 'usage-history.json');
// Where the first version kept it; read once to carry the readings over.
const LEGACY_FILE: string = join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'orbit', 'usage-history.json');

export async function loadUsageHistory(): Promise<UsageSample[]> {
  const stored: UsageSample[] | null = await readSamples(HISTORY_FILE);
  if (stored !== null) return stored;
  const legacy: UsageSample[] = (await readSamples(LEGACY_FILE)) ?? [];
  if (legacy.length > 0) await saveUsageHistory(legacy);
  return legacy;
}

async function readSamples(file: string): Promise<UsageSample[] | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
    return Array.isArray(parsed) ? parsed.filter(isSample) : null;
  } catch {
    return null;
  }
}

export async function saveUsageHistory(history: readonly UsageSample[]): Promise<void> {
  try {
    await mkdir(dirname(HISTORY_FILE), { recursive: true });
    await writeFile(HISTORY_FILE, JSON.stringify(history));
  } catch {
    // Not persisted: the chart then only shows what this run has read.
  }
}

function isSample(value: unknown): value is UsageSample {
  const sample: Partial<UsageSample> = (value ?? {}) as Partial<UsageSample>;
  return typeof sample.at === 'number' && typeof sample.percent === 'number';
}
