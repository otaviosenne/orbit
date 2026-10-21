import { element } from '../dom';
import { CLOSE_ICON, SEARCH_ICON } from '../icons';
import type { HelpSource } from './help-content';
import { renderHelpContent } from './help-content';
import { queryTerms } from './text-search';

const CLOSE_KEY: string = 'Escape';
const TOGGLE_KEY: string = '?';
const TITLE_ID: string = 'help-title';

// Orbit's Help: a centered macOS-style sheet over a dark overlay, with every shortcut and the common
// questions, filtered as you type. Escape clears a search first, then closes; so do the X and the overlay.
export class HelpModal {
  private readonly overlay: HTMLDivElement = element('div', 'help-overlay');
  private readonly search: HTMLInputElement = element('input', 'help-search-input');
  private readonly body: HTMLDivElement = element('div', 'help-body');
  // Focus goes back where it was (the composer, say) when Help closes.
  private returnFocus: HTMLElement | null = null;

  constructor(private readonly source: HelpSource) {
    this.overlay.hidden = true;
    this.overlay.append(this.renderPanel());
    document.body.append(this.overlay);
    // A press, not a click: a drag that starts in the panel and ends on the overlay must not close it.
    this.overlay.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (event.target === this.overlay) this.close();
    });
    this.search.addEventListener('input', (): void => this.render());
    // Captured before anything else, like the lightbox: while Help is open, the app behind it gets no keys.
    document.addEventListener('keydown', (event: KeyboardEvent): void => this.handleKey(event), true);
  }

  get isOpen(): boolean {
    return !this.overlay.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.search.value = '';
    this.render();
    this.overlay.hidden = false;
    this.search.focus();
  }

  close(): void {
    this.overlay.hidden = true;
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.isOpen) return;
    const isInSearch: boolean = event.target === this.search;
    if (event.key === CLOSE_KEY) return this.consume(event, (): void => this.dismissStep());
    if (event.key === TOGGLE_KEY && !isInSearch) return this.consume(event, (): void => this.close());
    // Typing in the search reaches the field; any other key must not reach Space-to-talk or the board behind.
    if (!isInSearch) event.stopPropagation();
  }

  private consume(event: KeyboardEvent, action: () => void): void {
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  private dismissStep(): void {
    if (this.search.value.length === 0) return this.close();
    this.search.value = '';
    this.render();
    this.search.focus();
  }

  private render(): void {
    this.body.replaceChildren(...renderHelpContent(this.source, this.search.value, queryTerms(this.search.value)));
    this.body.scrollTop = 0;
  }

  private renderPanel(): HTMLElement {
    const panel: HTMLDivElement = element('div', 'help-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', TITLE_ID);
    panel.append(this.renderHead(), this.body);
    return panel;
  }

  private renderHead(): HTMLElement {
    const head: HTMLElement = element('header', 'help-head');
    const title: HTMLHeadingElement = element('h2', 'help-title', 'Orbit Help');
    title.id = TITLE_ID;
    const close: HTMLButtonElement = element('button', 'icon-button help-close');
    close.type = 'button';
    close.title = 'Close (Esc)';
    close.setAttribute('aria-label', 'Close help');
    close.innerHTML = CLOSE_ICON;
    close.addEventListener('click', (): void => this.close());
    const titleRow: HTMLDivElement = element('div', 'help-title-row');
    titleRow.append(title, close);
    head.append(titleRow, this.renderSearch());
    return head;
  }

  private renderSearch(): HTMLElement {
    const field: HTMLLabelElement = element('label', 'help-search');
    field.innerHTML = SEARCH_ICON;
    this.search.type = 'text';
    this.search.placeholder = 'Search shortcuts and questions';
    this.search.spellcheck = false;
    this.search.setAttribute('aria-label', 'Search help');
    field.append(this.search);
    return field;
  }
}
