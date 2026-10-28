import { delay } from '../run-command';
import { showsReviewSubmit } from './screen/picker-evidence';

// Claude Code draws the review a moment after the last tab is answered; on a busy machine the first look comes too
// early, and giving up there left the answers unsent with the review waiting for an Enter.
export const REVIEW_TIMEOUT_MS: number = 3000;
const REVIEW_POLL_MS: number = 150;

export interface ScreenReader {
  plainScreen(): Promise<string>;
}

// The review screen once it shows, or null if it never did within the timeout.
export async function waitForReview(terminal: ScreenReader, timeoutMs: number = REVIEW_TIMEOUT_MS, pollMs: number = REVIEW_POLL_MS): Promise<string | null> {
  const deadline: number = Date.now() + timeoutMs;
  for (;;) {
    const screen: string = await terminal.plainScreen();
    if (showsReviewSubmit(screen)) return screen;
    if (Date.now() >= deadline) return null;
    await delay(pollMs);
  }
}
