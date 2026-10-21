import type { TranscriptList } from '../transcript-list';
import type { OlderHistory } from './older-history';
import type { PageFetch } from './paged-transcript';
import { PagedTranscript } from './paged-transcript';

// Within this distance of the top, the page before the oldest one shown is brought in.
export const NEAR_TOP_PX: number = 240;

// A live thread that starts on its latest page and grows upward as it is scrolled toward the top.
export class ThreadFeed implements OlderHistory {
  private readonly pages: PagedTranscript;
  private sessionId: string | null = null;

  constructor(private readonly root: HTMLElement, private readonly list: TranscriptList, pageSize: number) {
    this.pages = new PagedTranscript(pageSize);
    root.addEventListener('scroll', (): void => this.loadOlderNearTop(), { passive: true });
  }

  get canLoadOlder(): boolean {
    return this.pages.canLoadOlder;
  }

  // thread: the chat itself or one of its agents; another thread starts over from its latest page.
  async refresh(sessionId: string, thread: string, fetch: PageFetch): Promise<void> {
    this.sessionId = sessionId;
    if (!(await this.pages.refresh(thread, fetch))) return;
    this.show();
    this.loadOlderNearTop();
  }

  async loadOlder(): Promise<boolean> {
    const added: boolean = await this.pages.loadOlder();
    if (added) this.show();
    return added;
  }

  clear(): void {
    this.pages.clear();
    this.sessionId = null;
    this.list.clear();
  }

  private show(): void {
    const thread: string | null = this.pages.thread;
    if (this.sessionId !== null && thread !== null) this.list.show(this.sessionId, this.pages.items, thread);
  }

  // Also runs after each refresh: a first page shorter than the thread never scrolls, so it would never ask.
  private loadOlderNearTop(): void {
    if (!this.isNearTop() || !this.pages.canLoadOlder) return;
    void this.loadOlder().then((added: boolean): void => {
      if (added) this.loadOlderNearTop();
    });
  }

  // A thread that is not laid out (another view, a closed panel) reads as scrolled to the top; it must not page.
  private isNearTop(): boolean {
    return this.root.isConnected && this.root.clientHeight > 0 && this.root.scrollTop < NEAR_TOP_PX;
  }
}
