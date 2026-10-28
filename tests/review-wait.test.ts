import { describe, expect, it } from 'vitest';
import { waitForReview } from '../src/main/questions/review-wait';

const LAST_TAB: string = 'Which color?\n❯ 1. Red\n  2. Blue\nEnter to select';
const REVIEW: string = 'Review your answers\n❯ 1. Submit answers\n  2. Cancel';
const POLL_MS: number = 1;

// Shows the last tab for the first `slowReads` reads, then the review.
function terminalShowingReviewAfter(slowReads: number): { plainScreen: () => Promise<string> } {
  let reads: number = 0;
  return { plainScreen: async (): Promise<string> => (reads++ < slowReads ? LAST_TAB : REVIEW) };
}

describe('waitForReview', () => {
  it('keeps looking until the review is drawn', async () => {
    expect(await waitForReview(terminalShowingReviewAfter(3), 1000, POLL_MS)).toBe(REVIEW);
  });

  it('gives up once the timeout passes without a review', async () => {
    expect(await waitForReview(terminalShowingReviewAfter(Number.POSITIVE_INFINITY), 20, POLL_MS)).toBeNull();
  });
});
