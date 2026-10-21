import type { ResourceSnapshot } from '../../shared/chat-resources';
import { element } from '../dom';
import { CARET_DOWN_ICON } from '../icons';
import type { ChatIdentity, ResourceTable } from './resources-table';
import { buildResourceTable } from './resources-table';
import { RESOURCES_NOTE, renderResourceTable } from './resources-view';

const POLL_MS: number = 2000;
const OPEN_CLASS: string = 'is-open';

// Settings' Resources section. One persistent element, re-attached on every settings render, that polls on its own
// only while Settings is on screen and the section is unfolded: main reads /proc just when asked, so a folded or
// hidden section costs nothing. It starts folded, since the table is a check you open on purpose.
export class ResourcesSection {
  readonly root: HTMLElement = element('section', 'settings-section resources-section');
  private snapshot: ResourceSnapshot | null = null;
  private error: string | null = null;
  private active: boolean = false;
  private timer: number | null = null;
  private refreshing: boolean = false;
  private expanded: boolean = false;
  private readonly toggle: HTMLButtonElement = renderToggle();

  constructor(private readonly openChats: () => readonly ChatIdentity[]) {
    this.toggle.addEventListener('click', (): void => this.setExpanded(!this.expanded));
    this.render();
    document.addEventListener('visibilitychange', (): void => this.sync());
  }

  // Called on every view render; cheap when nothing changes.
  setActive(active: boolean): void {
    this.active = active;
    this.sync();
  }

  private setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.render();
    this.sync();
  }

  private sync(): void {
    const shouldPoll: boolean = this.active && this.expanded && document.visibilityState !== 'hidden';
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
    this.root.classList.toggle(OPEN_CLASS, this.expanded);
    this.toggle.setAttribute('aria-expanded', String(this.expanded));
    this.root.replaceChildren(this.toggle, ...(this.expanded ? this.body() : []));
  }

  private body(): HTMLElement[] {
    if (this.error !== null) return [element('p', 'settings-note', `Could not measure: ${this.error}`)];
    if (this.snapshot === null) return [element('p', 'settings-note', 'Measuring…')];
    const table: ResourceTable = buildResourceTable(this.snapshot, this.openChats());
    if (table.rows.length === 0) return [element('p', 'settings-note', 'No open chats.')];
    return [renderResourceTable(table), element('p', 'settings-note', RESOURCES_NOTE)];
  }
}

// The heading doubles as the fold switch, like the chat settings' collapsed rows.
function renderToggle(): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'settings-heading settings-fold');
  button.type = 'button';
  const caret: HTMLSpanElement = element('span', 'settings-fold-caret');
  caret.innerHTML = CARET_DOWN_ICON;
  button.append(caret, element('span', '', 'Resources'), element('span', 'settings-fold-hint', 'CPU and memory per chat'));
  return button;
}
