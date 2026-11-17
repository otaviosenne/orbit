import type { ChatStatus } from '../shared/types';

// Claude Code starts its terminal's title with this mark while it waits for you; while it works the title spins
// through ◐◓◑◒ instead.
const IDLE_TITLE_MARK: string = '✳';
// The status file can trail the end of a turn by a moment, so only a busy that has stood this long is checked.
export const STALE_BUSY_MS: number = 2 * 60_000;

// Whether a chat's "busy" is old enough to be checked against its terminal.
export function needsTitleCheck(status: ChatStatus, statusSince: number, now: number): boolean {
  return status === 'busy' && now - statusSince >= STALE_BUSY_MS;
}

// Claude Code stops rewriting its status file once its file writes fail (on 16 Nov 2026 a `sudo tar -C /` left the
// filesystem unreadable for a few seconds), so the file can say busy for hours while the terminal waits. Only the
// title's positive idle mark overrides it: no title, or any other title, keeps what the file says.
export function correctedStatus(status: ChatStatus, statusSince: number, now: number, title: string | null): ChatStatus {
  if (!needsTitleCheck(status, statusSince, now) || title === null) return status;
  return title.startsWith(IDLE_TITLE_MARK) ? 'idle' : status;
}
