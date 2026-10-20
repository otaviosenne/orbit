import { describe, expect, it } from 'vitest';
import type { TranscriptPages } from '../src/renderer/sheet/paging/transcript-pages';
import { NO_PAGES, olderPageLimit, receivedPage, withLatest, withOlder } from '../src/renderer/sheet/paging/transcript-pages';
import type { NoticeItem, TranscriptItem } from '../src/shared/types';

const item = (id: string): NoticeItem => ({ kind: 'notice', id, timestamp: 0, tone: 'info', title: id, detail: null });
const items = (...ids: string[]): TranscriptItem[] => ids.map(item);
const ids = (pages: TranscriptPages): string[] => pages.items.map((entry: TranscriptItem) => entry.id);

describe('receivedPage', () => {
  it('has older items when main filled the whole page', () => {
    expect(receivedPage(items('a', 'b', 'c'), 3).hasOlder).toBe(true);
  });

  it('reaches the start when main answered with fewer items than asked', () => {
    expect(receivedPage(items('a', 'b'), 3)).toEqual({ items: items('a', 'b'), hasOlder: false });
  });

  it('cuts an answer that ignored the limit down to the newest page', () => {
    expect(ids(receivedPage(items('a', 'b', 'c', 'd'), 2))).toEqual(['c', 'd']);
  });
});

describe('withLatest', () => {
  it('appends what a poll brought after the loaded items, keeping older pages', () => {
    const loaded: TranscriptPages = { items: items('a', 'b', 'c', 'd'), hasOlder: true };
    const merged: TranscriptPages = withLatest(loaded, { items: items('c', 'd', 'e'), hasOlder: true });
    expect(ids(merged)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(merged.hasOlder).toBe(true);
  });

  it('takes the poll\'s copy of overlapping items, so a tool result that arrived shows', () => {
    const loaded: TranscriptPages = { items: items('a', 'b'), hasOlder: false };
    const fresh: NoticeItem = { ...item('b'), title: 'done' };
    const merged: TranscriptPages = withLatest({ ...loaded, hasOlder: true }, { items: [item('a'), fresh], hasOlder: true });
    expect(merged.items[1]).toBe(fresh);
  });

  it('starts over from the latest page when more arrived than a page holds', () => {
    const loaded: TranscriptPages = { items: items('a', 'b'), hasOlder: false };
    expect(withLatest(loaded, { items: items('x', 'y'), hasOlder: true })).toEqual({ items: items('x', 'y'), hasOlder: true });
  });

  it('uses the poll alone when the whole transcript fits in one page', () => {
    expect(withLatest({ items: items('a', 'b'), hasOlder: true }, { items: items('b'), hasOlder: false })).toEqual({ items: items('b'), hasOlder: false });
  });

  it('fills an empty thread with its first page', () => {
    expect(ids(withLatest(NO_PAGES, { items: items('a', 'b'), hasOlder: true }))).toEqual(['a', 'b']);
  });
});

describe('withOlder', () => {
  it('prepends the older items and keeps the newer ones a poll already brought', () => {
    const loaded: TranscriptPages = { items: items('c', 'd', 'e'), hasOlder: true };
    // Asked for before 'e' arrived.
    const merged: TranscriptPages = withOlder(loaded, { items: items('a', 'b', 'c', 'd'), hasOlder: false });
    expect(ids(merged)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(merged.hasOlder).toBe(false);
  });

  it('falls back to the older answer when the two do not meet', () => {
    expect(ids(withOlder({ items: items('z'), hasOlder: true }, { items: items('a', 'b'), hasOlder: true }))).toEqual(['a', 'b']);
  });
});

describe('olderPageLimit', () => {
  it('asks for one page more than what is loaded', () => {
    expect(olderPageLimit({ items: items('a', 'b', 'c'), hasOlder: true }, 20)).toBe(23);
  });
});
