import type { ResourceSnapshot } from '../../shared/chat-resources';
import { element } from '../dom';
import type { ChatIdentity, ResourceTable } from './resources-table';
import { buildResourceTable } from './resources-table';
import { RESOURCES_NOTE, renderResourceTable } from './resources-view';

const POLL_MS: number = 2000;
const LEAD: string = 'CPU and memory of each open chat, with everything it started.';

// Settings' Resources page. One persistent element, re-attached on every settings render, that polls on its own
// only while its page is on screen: main reads /proc just when asked, so a hidden page costs nothing.
export class ResourcesSection {
  readonly root: HTMLElement = element('section', 'settings-section resources-section');
  private snapshot: ResourceSnapshot | null = null;
  private error: string | null = null;
  private active: boolean = false;
  private timer: number | null = null;
  private refreshing: boolean = false;

  constructor(private readonly openChats: () => readonly ChatIdentity[]) {
    this.render();
    document.addEventListener('visibilitychange', (): void => this.sync());
  }

  // Called on every view render; cheap when nothing changes.
  setActive(active: boolean): void {
    this.active = active;
    this.sync();
  }

  private sync(): void {
    const shouldPoll: boolean = this.active && document.visibilityState !== 'hidden';
    if (shouldPoll && this.timer === null) this.start();
    else if (!shouldPoll && this.timer !== null) this.stop();
  }

  private start(): void {
    void this.refresh();
    this.timer = window.setInterval((): void => void this.refresh(), POLL_MS);
  }

  // Numbers from before a pause would read as current when Settings comes back, so they go too.
  private stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.snapshot = null;
    this.render();
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      this.snapshot = await window.radar.getChatResources();
      this.error = null;
    } catch (error: unknown) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.refreshing = false;
    }
    if (this.timer !== null) this.render();
  }

  private render(): void {
    this.root.replaceChildren(element('h2', 'settings-heading', 'Resources'), element('p', 'settings-lead', LEAD), ...this.body());
  }

  private body(): HTMLElement[] {
    if (this.error !== null) return [element('p', 'settings-note', `Could not measure: ${this.error}`)];
    if (this.snapshot === null) return [element('p', 'settings-note', 'Measuring…')];
    const table: ResourceTable = buildResourceTable(this.snapshot, this.openChats());
    if (table.rows.length === 0) return [element('p', 'settings-note', 'No open chats.')];
    return [renderResourceTable(table), element('p', 'settings-note', RESOURCES_NOTE)];
  }
}

