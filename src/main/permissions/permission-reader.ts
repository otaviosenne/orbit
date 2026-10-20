import type { ChatRadar } from '../../core/chat-radar';
import type { PermissionMode } from '../../shared/permission-modes';
import { isSessionId } from '../../shared/session-id';
import type { ChatPermissions } from '../../shared/types';
import type { PickerStep } from '../questions/picker-keys';
import { footerPermissionMode } from './permission-footer';
import type { PermissionTarget } from './permission-target';
import { permissionTarget, switchBlocker } from './permission-target';

// What mode switching needs from a chat's terminal; PickerTerminal provides it over the kitty socket.
export interface ModeTerminal {
  run(steps: readonly PickerStep[]): Promise<void>;
  plainScreen(): Promise<string>;
}

const NOT_OPEN: ChatPermissions = { mode: null, lockedReason: 'The chat is not open' };
const NO_FOOTER_REASON: string = 'The mode is not visible in the terminal';

// The footer is read first because the transcript logs the mode only when the next turn starts.
export async function readChatPermissions(radar: ChatRadar, sessionId: unknown): Promise<ChatPermissions> {
  if (!isSessionId(sessionId)) return NOT_OPEN;
  const target: PermissionTarget | null = await permissionTarget(sessionId);
  if (target === null) return NOT_OPEN;
  const onScreen: PermissionMode | null = target.terminal === null ? null : await screenMode(target.terminal);
  return {
    mode: onScreen ?? (await radar.loggedPermissionMode(sessionId)),
    lockedReason: switchBlocker(target) ?? (onScreen === null ? NO_FOOTER_REASON : null),
  };
}

export async function screenMode(terminal: ModeTerminal): Promise<PermissionMode | null> {
  try {
    return footerPermissionMode(await terminal.plainScreen());
  } catch {
    return null;
  }
}
