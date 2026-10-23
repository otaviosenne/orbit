import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { UsageSample } from '../shared/types';

// Next to the usage cache: the pace chart's readings survive restarts, since the endpoint has no past to ask for.
const HISTORY_FILE: string = join(process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'), 'orbit', 'usage-history.json');

export async function loadUsageHistory(): Promise<UsageSample[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(HISTORY_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed.filter(isSample) : [];
  } catch {
    return [];
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
