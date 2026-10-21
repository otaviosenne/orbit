import type { ActionResult } from '../../../shared/types';

// A rejected IPC call reads like any failed action, so the card can show why.
export async function settleAction(result: Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await result;
  } catch (error: unknown) {
    return { ok: false, method: null, error: error instanceof Error ? error.message : String(error) };
  }
}
