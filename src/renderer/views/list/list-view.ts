import type { ChatSnapshot } from '../../../shared/types';
import { element } from '../../dom';
import type { BoardMarks } from '../board-view';
import { animateMoves, measureTops } from '../timeline-lines/flip-animation';
import type { RowKeyAction } from './list-keys';
import { rowKeyAction } from './list-keys';
import type { ListSortMode } from './list-order';
import { listOrder, mergeManualOrder, moveItem } from './list-order';
import type { ListRow } from './list-row';
import { LIST_SESSION_ATTRIBUTE, ROW_BUTTON_CLASS, createRow, fillRow } from './list-row';
import { loadListSortMode, saveListSortMode } from './list-sort-mode';
import type { ListStatus } from './list-status';
import { listStatuses } from './list-status';
import { ManualOrderStore } from './manual-order-store';
import { RowDrag } from './row-drag';
import { SortControl } from './sort-control';

// What the list needs to know about each chat beyond its snapshot: the Board's own marks.
export type ListMarks = Pick<BoardMarks, 'openSessionId' | 'isUnseen' | 'hasUnreadReply' | 'pinnedOrder' | 'restingPin'>;

export interface ListViewHandlers {
  // Opens the chat's side panel, or closes it if that chat is the one open.
  readonly open: (sessionId: string) => void;
  // A press started or ended; the app redraws then, since polls that came meanwhile were held back.
  readonly changed: () => void;
}

interface ListInput {
  readonly chats: readonly ChatSnapshot[];
  readonly marks: ListMarks;
  readonly now: number;
}

const EMPTY_TEXT: string = 'No open chats';
const MANUAL_CLASS: string = 'is-manual';
// A click with no pointer behind it (detail 0) comes from Enter or Space on the focused row.
const KEYBOARD_CLICK_DETAIL: number = 0;

// One row per open chat, sorted A–Z or in the user's own order. Mounted once and updated in place, like the
// Timeline's lines, so rows keep focus across polls and glide (FLIP) when the order changes.
export class ListView {
  private readonly root: HTMLDivElement = element('div', 'list-view');
  private readonly rowsList: HTMLOListElement = element('ol', 'list-rows');
  private readonly count: HTMLSpanElement = element('span', 'list-count');
  private readonly empty: HTMLParagraphElement = element('p', 'list-empty', EMPTY_TEXT);
  private readonly announcer: HTMLParagraphElement = element('p', 'list-announcer');
  private readonly rows: Map<string, ListRow> = new Map();
  private readonly store: ManualOrderStore = new ManualOrderStore();
  private readonly sort: SortControl;
  private readonly drag: RowDrag;
  private mode: ListSortMode = loadListSortMode();
  private input: ListInput | null = null;

  constructor(private readonly handlers: ListViewHandlers) {
    this.sort = new SortControl(this.mode, (mode: ListSortMode): void => this.setMode(mode));
    this.drag = new RowDrag({
      list: this.rowsList,
      scroller: this.root,
      canReorder: (): boolean => this.mode === 'manual',
      open: handlers.open,
      drop: (_sessionId: string, from: number, to: number): void => this.drop(from, to),
      changed: handlers.changed,
    });
    this.build();
    this.rowsList.addEventListener('click', (event: MouseEvent): void => this.openFromKeyboard(event));
    this.rowsList.addEventListener('keydown', (event: KeyboardEvent): void => this.handleKey(event));
  }

  // True from a press on a row until it is released; the app holds off redrawing meanwhile.
  get isPressed(): boolean {
    return this.drag.isPressed;
  }

  mount(host: HTMLElement): void {
    if (this.root.parentElement !== host) host.replaceChildren(this.root);
  }

  update(chats: readonly ChatSnapshot[], marks: ListMarks, now: number): void {
    this.input = { chats, marks, now };
    if (!this.drag.isPressed) this.render(measureTops(this.items()), false);
  }

  private build(): void {
    const title: HTMLHeadingElement = element('h2', 'list-title', 'Chats');
    title.append(this.count);
    const header: HTMLElement = element('header', 'list-header');
    header.append(title, this.sort.root);
    // WebKit stops announcing a list once its markers are hidden, unless the role is spelled out.
    this.rowsList.setAttribute('role', 'list');
    this.rowsList.setAttribute('aria-label', 'Open chats');
    const group: HTMLElement = element('section', 'list-group');
    group.append(this.rowsList, this.empty);
    const hint: HTMLParagraphElement = element('p', 'list-hint', 'Hold a chat, then drag it up or down.');
    hint.append(element('span', 'list-hint-keys', ' With a chat focused, Alt+↑ and Alt+↓ move it.'));
    this.announcer.setAttribute('aria-live', 'polite');
    this.root.append(header, group, hint, this.announcer);
  }

  // before: where each row was seen, so rows that change place glide from there. forced: animate even when the
  // order looks unchanged, because a drop already shows the new order through the drag's offsets.
  private render(before: ReadonlyMap<string, number>, forced: boolean): void {
    if (this.input === null) return;
    const { chats, marks, now } = this.input;
    const order: string[] = listOrder(this.mode, chats, this.store.order);
    const statuses: Map<string, ListStatus> = listStatuses(chats, marks.isUnseen, now, marks.restingPin);
    const reordered: boolean = this.syncRows(chats, order);
    for (const chat of chats) this.fill(chat, marks, statuses, now);
    if (reordered) this.placeRows(order);
    if (reordered || forced) animateMoves(this.items(), before);
    this.root.classList.toggle(MANUAL_CLASS, this.mode === 'manual');
    this.count.textContent = String(chats.length);
    this.empty.hidden = chats.length > 0;
  }

  // Adds rows for new chats and drops those of closed ones; true when the rows on screen are not in this order.
  private syncRows(chats: readonly ChatSnapshot[], order: readonly string[]): boolean {
    const open: Set<string> = new Set(order);
    for (const [sessionId, row] of this.rows) {
      if (open.has(sessionId)) continue;
      row.item.remove();
      this.rows.delete(sessionId);
    }
    for (const chat of chats) if (!this.rows.has(chat.sessionId)) this.rows.set(chat.sessionId, createRow(chat.sessionId));
    const shown: string[] = this.shownOrder();
    return shown.length !== order.length || shown.some((sessionId: string, index: number) => sessionId !== order[index]);
  }

  private fill(chat: ChatSnapshot, marks: ListMarks, statuses: ReadonlyMap<string, ListStatus>, now: number): void {
    const row: ListRow | undefined = this.rows.get(chat.sessionId);
    const status: ListStatus | undefined = statuses.get(chat.sessionId);
    if (row === undefined || status === undefined) return;
    fillRow(row, {
      chat,
      status,
      isOpen: chat.sessionId === marks.openSessionId,
      isPinned: marks.pinnedOrder.includes(chat.sessionId),
      hasUnreadReply: marks.hasUnreadReply(chat),
      isManual: this.mode === 'manual',
    }, now);
  }

  // Moving an element out of the page takes its focus away, so the focused row gets it back.
  private placeRows(order: readonly string[]): void {
    const focused: Element | null = document.activeElement;
    this.rowsList.append(...order.flatMap((sessionId: string): HTMLElement[] => {
      const row: ListRow | undefined = this.rows.get(sessionId);
      return row === undefined ? [] : [row.item];
    }));
    if (focused instanceof HTMLElement && focused !== document.activeElement && this.rowsList.contains(focused)) focused.focus({ preventScroll: true });
  }

  private setMode(mode: ListSortMode): void {
    if (mode === this.mode) return;
    const before: Map<string, number> = measureTops(this.items());
    this.mode = mode;
    saveListSortMode(mode);
    this.sort.select(mode);
    if (mode === 'manual') this.seedManualOrder();
    this.render(before, false);
  }

  // Chats that appear later then go after these, even when A–Z would put them first. Saved on the user's switch,
  // never on a render, and only with chats on screen, so an empty first poll cannot wipe the order.
  private seedManualOrder(): void {
    const chats: readonly ChatSnapshot[] = this.input?.chats ?? [];
    if (chats.length > 0) this.store.save(mergeManualOrder(this.store.order, chats));
  }

  // The rows still sit where the drag left them; they are measured there, then laid out in the new order.
  private drop(from: number, to: number): void {
    const before: Map<string, number> = measureTops(this.items());
    for (const row of this.rows.values()) clearOffset(row.item);
    this.saveMove(from, to);
    this.render(before, true);
  }

  private saveMove(from: number, to: number): void {
    this.store.save(moveItem(this.shownOrder(), from, to));
  }

  private openFromKeyboard(event: MouseEvent): void {
    const sessionId: string | undefined = this.sessionAt(event.target);
    if (event.detail === KEYBOARD_CLICK_DETAIL && sessionId !== undefined) this.handlers.open(sessionId);
  }

  private handleKey(event: KeyboardEvent): void {
    const sessionId: string | undefined = this.sessionAt(event.target);
    const action: RowKeyAction = rowKeyAction(event);
    if (sessionId === undefined || action === null) return;
    const index: number = this.shownOrder().indexOf(sessionId);
    if (action.kind === 'move' && this.mode !== 'manual') return;
    event.preventDefault();
    if (action.kind === 'focus') this.focusRow(index + action.step);
    else this.moveByKey(index, action.step);
  }

  private focusRow(index: number): void {
    const sessionId: string | undefined = this.shownOrder()[index];
    if (sessionId !== undefined) this.rows.get(sessionId)?.button.focus();
  }

  private moveByKey(index: number, step: -1 | 1): void {
    const order: string[] = this.shownOrder();
    const to: number = index + step;
    const sessionId: string | undefined = order[index];
    if (sessionId === undefined || to < 0 || to >= order.length) return;
    const before: Map<string, number> = measureTops(this.items());
    this.saveMove(index, to);
    this.render(before, false);
    this.announce(sessionId, to, order.length);
  }

  // Screen readers hear where a row moved, since nothing else tells them.
  private announce(sessionId: string, index: number, total: number): void {
    const name: string = this.input?.chats.find((chat: ChatSnapshot) => chat.sessionId === sessionId)?.name ?? 'Chat';
    this.announcer.textContent = `${name} moved to position ${index + 1} of ${total}`;
  }

  private sessionAt(target: EventTarget | null): string | undefined {
    const button: HTMLElement | null = (target as HTMLElement).closest<HTMLElement>(`.${ROW_BUTTON_CLASS}`);
    return button?.parentElement?.dataset[LIST_SESSION_ATTRIBUTE];
  }

  private shownOrder(): string[] {
    return [...this.rowsList.children].flatMap((child: Element): string[] => {
      const sessionId: string | undefined = (child as HTMLElement).dataset[LIST_SESSION_ATTRIBUTE];
      return sessionId === undefined ? [] : [sessionId];
    });
  }

  private items(): Map<string, HTMLElement> {
    return new Map([...this.rows].map(([sessionId, row]: [string, ListRow]): [string, HTMLElement] => [sessionId, row.item]));
  }
}

// Without its transition first, clearing the offset would start a slide that the glide then has to fight.
function clearOffset(item: HTMLElement): void {
  item.style.transition = 'none';
  item.style.transform = '';
}
