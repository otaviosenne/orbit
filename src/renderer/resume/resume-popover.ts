import { isTouchWeb } from '../host';
import { installSheetDismiss } from '../sheet-dismiss';
import type { PastChat } from '../../shared/types';
import { element } from '../dom';
import { FILTER_ICON, SEARCH_ICON } from '../icons';
import { loadResumeFilters, saveResumeFilters } from './filter-store';
import { FiltersMenu } from './filters-menu';
import { PAST_CHAT_ATTRIBUTE, renderPastChats, PEEK_SELECTOR } from './past-chat-list';
import { labelOptions } from '../voice-nav/voice-number';
import type { ResumeFilters } from './resume-filters';
import { activeFilterCount, applyFilters, repositoryNames } from './resume-filters';

export interface ResumePopoverActions {
  readonly pick: (sessionId: string) => void;
  // The eye: show the chat's history read-only, reopening nothing.
  readonly peek: (sessionId: string) => void;
  readonly close: () => void;
}

const ROW_SELECTOR: string = '.resume-row';
const ACTIVE_CLASS: string = 'is-active';
const NEXT_KEY: string = 'ArrowDown';
const PREVIOUS_KEY: string = 'ArrowUp';
const PICK_KEY: string = 'Enter';
const CLOSE_KEY: string = 'Escape';
// Rows added per step of the infinite scroll: a few screens' worth, so scrolling rarely waits on a step.
const PAGE_SIZE: number = 40;
// Starts the next step this far before the end of the list, so new rows are there before they are needed.
const PRELOAD_PX: number = 200;

// The searchable list of closed chats under the Resume button.
export class ResumePopover {
  readonly root: HTMLDivElement = element('div', 'resume-popover');
  private readonly search: HTMLInputElement = element('input', 'resume-search-input');
  private readonly filtersButton: HTMLButtonElement = element('button', 'resume-filters-button');
  private readonly list: HTMLDivElement = element('div', 'resume-list');
  private readonly menu: FiltersMenu = new FiltersMenu((filters: ResumeFilters): void => this.setFilters(filters));
  private filters: ResumeFilters = loadResumeFilters();
  private chats: readonly PastChat[] | null = null;
  private activeIndex: number = 0;
  private visible: readonly PastChat[] = [];
  private shownCount: number = PAGE_SIZE;

  constructor(private readonly actions: ResumePopoverActions) {
    this.root.hidden = true;
    this.root.append(this.renderHead(), this.list);
    installSheetDismiss(this.root, (): HTMLElement => this.list, (): void => this.actions.close());
    this.search.addEventListener('input', (): void => {
      this.activeIndex = 0;
      this.renderList();
    });
    this.root.addEventListener('keydown', (event: KeyboardEvent): void => this.handleKey(event));
    // Keeps the caret in the search field, so typing and arrow keys keep working after any click inside.
    this.root.addEventListener('mousedown', (event: MouseEvent): void => {
      if (event.target !== this.search) event.preventDefault();
    });
    this.list.addEventListener('pointermove', (event: PointerEvent): void => this.activateRowAt(event.target));
    this.list.addEventListener('click', (event: MouseEvent): void => this.pickRowAt(event.target));
    this.list.addEventListener('scroll', (): void => {
      if (this.list.scrollHeight - this.list.scrollTop - this.list.clientHeight < PRELOAD_PX) this.showMore();
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  // Opens on the previous list (or "Loading…") and refreshes when show() receives the new one.
  open(): void {
    this.root.hidden = false;
    this.search.value = '';
    this.activeIndex = 0;
    this.renderList();
    // On a touch screen focusing the search would raise the keyboard over the list before anything is typed.
    if (!isTouchWeb()) this.search.focus();
  }

  // Voice: picks the Nth row shown; false when the list has no such row.
  pickNumber(number: number): boolean {
    const row: HTMLElement | undefined = this.rows()[number - 1];
    this.pickRowAt(row ?? null);
    return row !== undefined;
  }

  show(chats: readonly PastChat[]): void {
    this.chats = chats;
    if (this.isOpen) this.renderList();
  }

  close(): void {
    this.menu.close();
    this.root.hidden = true;
  }

  private renderHead(): HTMLDivElement {
    const head: HTMLDivElement = element('div', 'resume-head');
    const field: HTMLLabelElement = element('label', 'resume-search');
    field.innerHTML = SEARCH_ICON;
    this.search.type = 'search';
    this.search.placeholder = 'Search chats';
    this.search.spellcheck = false;
    field.append(this.search);
    this.filtersButton.type = 'button';
    this.filtersButton.addEventListener('click', (): void => this.toggleMenu());
    head.append(field, this.filtersButton, this.menu.root);
    this.renderFiltersButton();
    return head;
  }

  // Only a count, never the chosen values, so the control stays the same small size.
  private renderFiltersButton(): void {
    const count: number = activeFilterCount(this.filters);
    this.filtersButton.innerHTML = FILTER_ICON;
    this.filtersButton.append(element('span', '', count === 0 ? 'Filters' : `Filters · ${count}`));
    this.filtersButton.classList.toggle('has-filters', count > 0);
  }

  private toggleMenu(): void {
    if (this.menu.isOpen) return this.menu.close();
    this.menu.open(this.filters, repositoryNames(this.chats ?? []));
  }

  private setFilters(filters: ResumeFilters): void {
    this.filters = filters;
    saveResumeFilters(filters);
    this.renderFiltersButton();
    this.activeIndex = 0;
    this.renderList();
  }

  private renderList(): void {
    if (this.chats === null) return this.list.replaceChildren(element('div', 'resume-empty', 'Loading…'));
    this.visible = applyFilters(this.chats, this.filters, this.search.value, Date.now());
    this.shownCount = PAGE_SIZE;
    if (this.visible.length === 0) return this.list.replaceChildren(element('div', 'resume-empty', this.chats.length === 0 ? 'No past chats' : 'No chats match'));
    this.list.scrollTop = 0;
    this.renderShown();
  }

  // Renders the first shownCount rows, with day headers worked out over them as a whole; the scroll
  // position is kept, so a new step only adds below.
  private renderShown(): void {
    const scrollTop: number = this.list.scrollTop;
    const shown: readonly PastChat[] = this.visible.slice(0, this.shownCount);
    this.list.replaceChildren(...renderPastChats(shown, this.filters.sort, Date.now()));
    this.list.scrollTop = scrollTop;
    labelOptions(this.rows(), (row: HTMLElement): HTMLElement => row.querySelector<HTMLElement>('.resume-row-title') ?? row);
    this.highlight(Math.min(this.activeIndex, shown.length - 1), false);
  }

  private showMore(): void {
    if (this.shownCount >= this.visible.length) return;
    this.shownCount += PAGE_SIZE;
    this.renderShown();
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.key === CLOSE_KEY) {
      // The app closes the chat panel on Escape too; this one belongs to the popover alone.
      event.stopPropagation();
      if (this.menu.isOpen) this.menu.close();
      else this.actions.close();
      return;
    }
    if (event.key === NEXT_KEY || event.key === PREVIOUS_KEY) {
      event.preventDefault();
      this.highlight(this.activeIndex + (event.key === NEXT_KEY ? 1 : -1), true);
    } else if (event.key === PICK_KEY) {
      event.preventDefault();
      this.pickRowAt(this.rows()[this.activeIndex] ?? null);
    }
  }

  private highlight(index: number, reveal: boolean): void {
    // Arrowing past the last rendered row brings in the next step first.
    if (index >= this.rows().length && reveal) this.showMore();
    const rows: HTMLElement[] = this.rows();
    if (rows.length === 0) return;
    this.activeIndex = Math.max(0, Math.min(index, rows.length - 1));
    rows.forEach((row: HTMLElement, position: number) => row.classList.toggle(ACTIVE_CLASS, position === this.activeIndex));
    if (reveal) rows[this.activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  private activateRowAt(target: EventTarget | null): void {
    const row: HTMLElement | null = rowOf(target);
    if (row !== null) this.highlight(this.rows().indexOf(row), false);
  }

  private pickRowAt(target: EventTarget | null): void {
    const sessionId: string | undefined = rowOf(target)?.dataset[PAST_CHAT_ATTRIBUTE];
    if (sessionId === undefined) return;
    if (target instanceof Element && target.closest(PEEK_SELECTOR) !== null) this.actions.peek(sessionId);
    else this.actions.pick(sessionId);
  }

  private rows(): HTMLElement[] {
    return [...this.list.querySelectorAll<HTMLElement>(ROW_SELECTOR)];
  }
}

function rowOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(ROW_SELECTOR) : null;
}
