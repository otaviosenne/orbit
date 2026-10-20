import { normalizeStatus } from '../../core/chat-status';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import type { ChatStatus } from '../../shared/types';
import { hasKittySocket } from '../kitty-remote';
import { PickerTerminal } from '../questions/picker-terminal';
import { findTerminalWindowPid } from '../terminal-window';

// A live chat and, when its window has a kitty remote-control socket, its terminal.
export interface PermissionTarget {
  readonly status: ChatStatus;
  readonly terminal: PickerTerminal | null;
}

const NO_SOCKET_REASON: string = 'Needs a chat opened with kitty remote control';
const BUSY_REASON: string = 'Claude is working; switch once it is idle';
const NOT_AT_PROMPT_REASON: string = 'The chat is not at its prompt';

// null when the chat is not open.
export async function permissionTarget(sessionId: string): Promise<PermissionTarget | null> {
  const session: SessionRecord | undefined = (await listLiveSessions()).find((live: SessionRecord) => live.sessionId === sessionId);
  if (session === undefined) return null;
  const windowPid: number | null = await findTerminalWindowPid(session.pid);
  const canReach: boolean = windowPid !== null && (await hasKittySocket(windowPid));
  return { status: normalizeStatus(session.status), terminal: canReach && windowPid !== null ? new PickerTerminal(windowPid) : null };
}

// Shift+Tab only cycles the mode at the prompt; while Claude works or a dialog is up the key means something else.
export function switchBlocker(target: PermissionTarget): string | null {
  if (target.terminal === null) return NO_SOCKET_REASON;
  if (target.status === 'busy') return BUSY_REASON;
  return target.status === 'idle' ? null : NOT_AT_PROMPT_REASON;
}
