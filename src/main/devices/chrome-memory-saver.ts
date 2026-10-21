import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LOCAL_STATE_FILE: string = 'Local State';
// Chrome's MemorySaverModeState: 0 is off, every other value discards background tabs in some way.
const MEMORY_SAVER_OFF: number = 0;

interface LocalState {
  readonly performance_tuning?: { readonly high_efficiency_mode?: { readonly state?: unknown } };
}

// A discarded tab reloads when shown, even for a moment while stepping past it, so stepping is refused when
// Memory Saver may have discarded tabs, or when its setting cannot be read.
export async function memorySaverMayDiscard(userDataDir: string): Promise<boolean> {
  try {
    const state: LocalState = JSON.parse(await readFile(join(userDataDir, LOCAL_STATE_FILE), 'utf8')) as LocalState;
    const mode: unknown = state.performance_tuning?.high_efficiency_mode?.state;
    return mode !== undefined && mode !== MEMORY_SAVER_OFF;
  } catch {
    return true;
  }
}
