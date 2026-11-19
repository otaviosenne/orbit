import type { ChatSnapshot } from '../../shared/types';
import type { ClosedCardKind } from '../views/closed-card';
import type { ClosedChat } from './closed-chats';

// What suspending a closed chat changes: there is no process left to end, so only the board's shared lists move.
export interface ClosedSuspensionHost {
  // Puts the chat in Suspended under its session id, the same record a suspended open chat gets.
  readonly addSuspended: (chat: ChatSnapshot) => void;
  // Drops it from the chats a shutdown left open, as closing an open chat does, so Suspended is its only card.
  readonly forgetLeftOpen: (sessionId: string) => void;
}

// A Closed card, left open by a shutdown or a closed pin, can be suspended; a suspended one already is.
export function canSuspendClosed(kind: ClosedCardKind): boolean {
  return kind !== 'suspended';
}

// Recorded in Suspended before it is forgotten as left open, so no redraw in between finds the chat with no card.
// Returns whether it was suspended.
export function suspendClosedChat(closed: ClosedChat | undefined, host: ClosedSuspensionHost): boolean {
  if (closed === undefined || !canSuspendClosed(closed.kind)) return false;
  host.addSuspended(closed.chat);
  host.forgetLeftOpen(closed.chat.sessionId);
  return true;
}
