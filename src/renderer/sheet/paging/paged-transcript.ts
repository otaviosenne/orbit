import type { TranscriptItem } from '../../../shared/types';
import type { TranscriptPages } from './transcript-pages';
import { NO_PAGES, olderPageLimit, receivedPage, withLatest, withOlder } from './transcript-pages';

// Asks main for a thread's last `limit` items.
export type PageFetch = (limit: number) => Promise<TranscriptItem[]>;

// One thread's loaded pages: polls fetch only the latest page, and older pages are added on request.
export class PagedTranscript {
  private pages: TranscriptPages = NO_PAGES;
  private shownThread: string | null = null;
  private fetch: PageFetch | null = null;
  private olderLoad: Promise<boolean> | null = null;

  constructor(private readonly pageSize: number) {}

  get items(): readonly TranscriptItem[] {
    return this.pages.items;
  }

  get thread(): string | null {
    return this.shownThread;
  }

  get canLoadOlder(): boolean {
    return this.pages.hasOlder;
  }

  // Resolves false when the answer belongs to a thread that has since been left or cleared.
  async refresh(thread: string, fetch: PageFetch): Promise<boolean> {
    if (thread !== this.shownThread) this.startThread(thread);
    this.fetch = fetch;
    const latest: TranscriptPages = receivedPage(await fetch(this.pageSize), this.pageSize);
    if (thread !== this.shownThread) return false;
    this.pages = withLatest(this.pages, latest);
    return true;
  }

  // Scrolling and the message search can both ask at once; they share the request already on its way.
  loadOlder(): Promise<boolean> {
    if (this.olderLoad !== null) return this.olderLoad;
    const load: Promise<boolean> = this.fetchOlder().finally((): void => {
      if (this.olderLoad === load) this.olderLoad = null;
    });
    this.olderLoad = load;
    return load;
  }

  clear(): void {
    this.startThread(null);
    this.fetch = null;
  }

  private startThread(thread: string | null): void {
    this.shownThread = thread;
    this.pages = NO_PAGES;
    this.olderLoad = null;
  }

  private async fetchOlder(): Promise<boolean> {
    const thread: string | null = this.shownThread;
    const fetch: PageFetch | null = this.fetch;
    if (fetch === null || !this.pages.hasOlder) return false;
    const limit: number = olderPageLimit(this.pages, this.pageSize);
    const older: TranscriptPages = receivedPage(await fetch(limit), limit);
    if (thread !== this.shownThread) return false;
    const loadedBefore: number = this.pages.items.length;
    this.pages = withOlder(this.pages, older);
    return this.pages.items.length > loadedBefore;
  }
}
