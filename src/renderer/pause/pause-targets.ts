import type { ChatSnapshot, PauseTarget } from '../../shared/types';
import { suspendStops } from '../suspend/suspend-stops';
import type { SuspendStops } from '../suspend/suspend-stops';

// A turn or an agent running: what a shutdown cuts off in the middle. A background shell alone (a dev server) is not
// unfinished work, so it does not count here.
export function isMidWork(chat: ChatSnapshot): boolean {
  const stops: SuspendStops = suspendStops(chat);
  return stops.isWorking || stops.agents > 0;
}

// Everything that makes the machine busy, shells included: pausing is for when the computer needs to be quiet.
function isRunningAnything(chat: ChatSnapshot): boolean {
  return isMidWork(chat) || suspendStops(chat).shells > 0;
}

// Escape also dismisses a pending question and a second one opens the rewind menu, so only a busy chat gets it; a chat
// waiting on a question is left alone, since typing into its picker would answer it.
export function pauseTargets(chats: readonly ChatSnapshot[], alreadyPaused: ReadonlySet<string>): PauseTarget[] {
  return chats
    .filter((chat: ChatSnapshot) => chat.status !== 'waiting' && !alreadyPaused.has(chat.sessionId) && isRunningAnything(chat))
    .map((chat: ChatSnapshot): PauseTarget => ({ pid: chat.pid, interrupt: chat.status === 'busy' }));
}
