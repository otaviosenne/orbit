import { readFile, rm, writeFile } from 'node:fs/promises';
import type { ShutdownPlan } from '../../shared/shutdown-plan';
import { parseShutdownPlan } from '../../shared/shutdown-plan';

const BOOT_ID_FILE: string = '/proc/sys/kernel/random/boot_id';

// Kept on disk so a plan survives Orbit restarting (a new release), but tied to this boot: a plan from before the
// machine last started is dropped, or the computer would shut down again right after being turned on.
export class ShutdownPlanStore {
  constructor(private readonly file: string) {}

  async load(): Promise<ShutdownPlan | null> {
    try {
      const saved: Record<string, unknown> = JSON.parse(await readFile(this.file, 'utf8')) as Record<string, unknown>;
      if (saved['bootId'] !== (await bootId())) return null;
      return parseShutdownPlan(saved['plan']);
    } catch {
      return null;
    }
  }

  async save(plan: ShutdownPlan | null): Promise<void> {
    if (plan === null) return void (await rm(this.file, { force: true }));
    await writeFile(this.file, JSON.stringify({ bootId: await bootId(), plan }));
  }
}

async function bootId(): Promise<string> {
  return (await readFile(BOOT_ID_FILE, 'utf8')).trim();
}
