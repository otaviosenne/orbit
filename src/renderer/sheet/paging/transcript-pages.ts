import type { TranscriptItem } from '../../../shared/types';

// What a thread has paged in so far, oldest first, and whether its transcript holds anything before that.
export interface TranscriptPages {
  readonly items: readonly TranscriptItem[];
  readonly hasOlder: boolean;
}

export const NO_PAGES: TranscriptPages = { items: [], hasOlder: false };

// Main answers with at most `limit` items and fewer only when nothing older exists; a route that ignores the limit
// (the demo) is cut down here so a page stays a page.
export function receivedPage(received: readonly TranscriptItem[], limit: number): TranscriptPages {
  return { items: received.slice(-limit), hasOlder: received.length >= limit };
}

// A poll brings only the latest page; it takes over the loaded tail from where the two meet, keeping older pages.
export function withLatest(pages: TranscriptPages, latest: TranscriptPages): TranscriptPages {
  // The whole transcript fits in one page, so there is nothing older to keep.
  if (!latest.hasOlder) return latest;
  const items: TranscriptItem[] | null = joinAt(pages.items, latest.items);
  // More arrived than one page holds since the last poll: the loaded tail no longer meets it, so start again from it.
  return items === null ? latest : { items, hasOlder: pages.hasOlder };
}

// An older page also carries the newest items as they were when it was asked for; a poll may have brought
// fresher ones since, so the loaded items win wherever the two overlap.
export function withOlder(pages: TranscriptPages, older: TranscriptPages): TranscriptPages {
  const items: TranscriptItem[] | null = joinAt(older.items, pages.items);
  return { items: items ?? [...older.items], hasOlder: older.hasOlder };
}

// One more page than what is loaded; main always answers from the newest item back.
export function olderPageLimit(pages: TranscriptPages, pageSize: number): number {
  return pages.items.length + pageSize;
}

// `head` up to where `tail` starts in it, then all of `tail`; null when `tail`'s first item is not in `head`.
function joinAt(head: readonly TranscriptItem[], tail: readonly TranscriptItem[]): TranscriptItem[] | null {
  const first: TranscriptItem | undefined = tail[0];
  if (first === undefined) return [...head];
  const start: number = head.findIndex((item: TranscriptItem) => item.id === first.id);
  return start === -1 ? null : [...head.slice(0, start), ...tail];
}
