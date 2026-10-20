import { isCycledPermissionMode } from '../../shared/permission-modes';
import { isSessionId } from '../../shared/session-id';
import type { ActionResult } from '../../shared/types';
import { failure } from '../terminal-input';
import { cycleTo } from './permission-cycle';
import type { PermissionTarget } from './permission-target';
import { permissionTarget, switchBlocker } from './permission-target';

// Two cycles interleaving on one chat would each misread the other's presses.
const switching: Set<string> = new Set();

// There is no slash command for the mode, so it is switched with Shift+Tab, and only at an idle prompt.
export async function switchPermissionMode(sessionId: unknown, mode: unknown): Promise<ActionResult> {
  if (!isSessionId(sessionId) || !isCycledPermissionMode(mode)) return failure('Unknown chat or mode');
  const target: PermissionTarget | null = await permissionTarget(sessionId);
  if (target === null) return failure('The chat is not open');
  const blocker: string | null = switchBlocker(target);
  if (blocker !== null || target.terminal === null) return failure(blocker ?? 'Terminal not reachable');
  if (switching.has(sessionId)) return failure('Already switching this chat');
  switching.add(sessionId);
  try {
    return await cycleTo(target.terminal, mode);
  } finally {
    switching.delete(sessionId);
  }
}
