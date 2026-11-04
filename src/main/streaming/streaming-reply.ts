import type { TranscriptItem } from '../../shared/types';
import { listLiveSessions } from '../../core/session-registry';
import type { SessionRecord } from '../../core/session-registry';
import { hasKittySocket, kittySocketPath } from '../kitty-remote';
import { runCommand } from '../run-command';
import { findTerminalWindowPid } from '../terminal-window';
import { parseStreamingReply } from './streaming-parser';
import { isAlreadyWritten } from '../../shared/written-check';

// Enough of the thread's end to hold the turn's replies so far.
const RECENT_ITEMS: number = 40;
const BUSY: string = 'busy';

export interface StreamingSource {
  transcript(sessionId: string, limit: number): Promise<TranscriptItem[]>;
}

// A chat's window never changes while its process lives, so it is looked up once per pid.
const windows: Map<number, Promise<number | null>> = new Map();

// The reply a working chat is writing right now and its transcript does not have yet; null otherwise, including for a
// chat whose terminal Orbit cannot read.
export async function readStreamingReply(source: StreamingSource, sessionId: string): Promise<string | null> {
  const chat: SessionRecord | undefined = (await listLiveSessions()).find((session: SessionRecord) => session.sessionId === sessionId);
  if (chat === undefined || chat.status !== BUSY) return null;
  const screen: string | null = await terminalText(chat.pid);
  const draft: string | null = screen === null ? null : parseStreamingReply(screen);
  if (draft === null) return null;
  return isAlreadyWritten(draft, await source.transcript(sessionId, RECENT_ITEMS)) ? null : draft;
}

async function terminalText(chatPid: number): Promise<string | null> {
  const windowPid: number | null = await windowOf(chatPid);
  if (windowPid === null || !(await hasKittySocket(windowPid))) return null;
  try {
    return await runCommand('kitty', ['@', '--to', `unix:${kittySocketPath(windowPid)}`, 'get-text', '--extent', 'all']);
  } catch {
    return null;
  }
}

function windowOf(chatPid: number): Promise<number | null> {
  const known: Promise<number | null> | undefined = windows.get(chatPid);
  if (known !== undefined) return known;
  const lookup: Promise<number | null> = findTerminalWindowPid(chatPid);
  windows.set(chatPid, lookup);
  return lookup;
}
