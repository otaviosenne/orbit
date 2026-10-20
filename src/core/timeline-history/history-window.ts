import { TIMELINE_MAX_HISTORY_MS } from '../../shared/time-span';
import type { SessionFile } from '../past-chats/session-files';

// The renderer names the window's start; anything but a real time is refused, and nothing older than the widest
// range is ever read.
export function historySince(requested: unknown, now: number): number | null {
  if (typeof requested !== 'number' || !Number.isFinite(requested)) return null;
  return Math.min(now, Math.max(requested, now - TIMELINE_MAX_HISTORY_MS));
}

// A transcript last written before the window cannot have been active in it, so no other file needs reading.
export function filesActiveSince(files: readonly SessionFile[], liveSessionIds: ReadonlySet<string>, since: number): SessionFile[] {
  return files.filter((file: SessionFile) => file.modifiedAt >= since && !liveSessionIds.has(file.sessionId));
}
