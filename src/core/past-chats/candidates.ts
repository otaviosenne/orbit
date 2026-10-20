import type { SessionFile } from './session-files';

const DAY_MS: number = 24 * 60 * 60 * 1000;
// A year back covers anything worth resuming; the cap keeps the first (uncached) listing from reading
// thousands of transcripts. The popover renders the list a page at a time as it scrolls.
export const PAST_CHAT_MAX_AGE_DAYS: number = 365;
export const PAST_CHAT_LIMIT: number = 2000;

// The most recent closed sessions, newest first, capped before any transcript is read.
export function selectCandidates(files: readonly SessionFile[], liveSessionIds: ReadonlySet<string>, now: number): SessionFile[] {
  const oldest: number = now - PAST_CHAT_MAX_AGE_DAYS * DAY_MS;
  return files
    .filter((file: SessionFile) => !liveSessionIds.has(file.sessionId) && file.modifiedAt >= oldest)
    .sort((a: SessionFile, b: SessionFile) => b.modifiedAt - a.modifiedAt)
    .slice(0, PAST_CHAT_LIMIT);
}
