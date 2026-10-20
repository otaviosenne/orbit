import type { ChatSnapshot } from '../../../shared/types';
import { element } from '../../dom';
import { SIDEBAR_ICON } from '../../icons';
import type { QuickSelection } from './quick-select';
import { renderQuickSelect } from './quick-select';
import { syncChildren } from './keyed-children';
import { SidebarRow } from './sidebar-row';

// The live chats, each one a toggle for the grid. Rows are kept across polls: a row rebuilt between a
// press and its release would lose the click.
export class GridSidebar {
  readonly root: HTMLElement = element('aside', 'grid-sidebar');
  private readonly list: HTMLElement = element('div', 'grid-chat-list');
  private readonly empty: HTMLElement = element('p', 'grid-sidebar-empty', 'No chats are open.');
  private readonly rows: Map<string, SidebarRow> = new Map();

  // footer: the grid's own controls, pinned under the list while the list scrolls.
  // onCollapse: folds the sidebar to a rail so the tiles get its width.
  // onQuickSelect: replaces the whole selection (all, none, or one board column).
  constructor(
    private readonly onToggle: (sessionId: string) => void,
    footer: HTMLElement,
    onCollapse: () => void,
    onQuickSelect: (selection: QuickSelection) => void,
  ) {
    const chats: HTMLDivElement = element('div', 'grid-sidebar-chats');
    chats.append(this.renderHead(onCollapse), renderQuickSelect(onQuickSelect), this.list, this.empty);
    this.root.append(chats, footer);
  }

  private renderHead(onCollapse: () => void): HTMLElement {
    const head: HTMLDivElement = element('div', 'grid-sidebar-head');
    const collapse: HTMLButtonElement = element('button', 'icon-button grid-sidebar-toggle');
    collapse.type = 'button';
    collapse.title = 'Show or hide the chat list';
    collapse.innerHTML = SIDEBAR_ICON;
    collapse.addEventListener('click', onCollapse);
    head.append(element('h2', 'column-title', 'Chats'), collapse);
    return head;
  }

  update(chats: readonly ChatSnapshot[], isAdded: (sessionId: string) => boolean): void {
    const shown: SidebarRow[] = chats.map((chat: ChatSnapshot) => {
      const row: SidebarRow = this.rowFor(chat.sessionId);
      row.update(chat, isAdded(chat.sessionId));
      return row;
    });
    this.forgetGone(new Set(chats.map((chat: ChatSnapshot) => chat.sessionId)));
    syncChildren(this.list, shown.map((row: SidebarRow) => row.root));
    this.empty.hidden = chats.length > 0;
  }

  private rowFor(sessionId: string): SidebarRow {
    const existing: SidebarRow | undefined = this.rows.get(sessionId);
    if (existing !== undefined) return existing;
    const row: SidebarRow = new SidebarRow(sessionId, this.onToggle);
    this.rows.set(sessionId, row);
    return row;
  }

  private forgetGone(liveIds: ReadonlySet<string>): void {
    for (const sessionId of this.rows.keys()) if (!liveIds.has(sessionId)) this.rows.delete(sessionId);
  }
}
