import { element } from '../dom';
import { isTouchWeb } from '../host';
import type { HelpSource } from './help-content';
import { helpTabSizes, renderHelpContent } from './help-content';
import { HELP_TITLE_ID, renderHelpHead } from './help-head';
import type { HelpTab } from './help-tab';
import { HELP_TAB_LABELS, availableHelpTabs, initialHelpTab, steppedHelpTab } from './help-tab';
import { HelpTabControl } from './help-tab-control';
import { loadHelpTab, saveHelpTab } from './help-tab-store';
import { queryTerms } from './text-search';

const CLOSE_KEY: string = 'Escape';
const TOGGLE_KEY: string = '?';
const BODY_ID: string = 'help-body';
// Arrow keys on a tab step through the tabs; how far each one moves.
const TAB_STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };
const SEARCH_HINTS: Readonly<Record<HelpTab, string>> = { shortcuts: 'Search shortcuts', voice: 'Search voice commands', questions: 'Search questions' };

// Orbit's Help: a centered macOS-style sheet over a dark overlay, with the shortcuts and the common questions
// in separate tabs, the open one filtered as you type. Escape clears a search first, then closes; so do the X
// and the overlay.
export class HelpModal {
  private readonly overlay: HTMLDivElement = element('div', 'help-overlay');
  private readonly panel: HTMLDivElement = element('div', 'help-panel');
  private readonly search: HTMLInputElement = element('input', 'help-search-input');
  private readonly body: HTMLDivElement = element('div', 'help-body');
  private readonly tabs: readonly HelpTab[];
  // Left out when this host has only one part to show.
  private readonly tabControl: HelpTabControl | null;
  // The tab its owner last picked; while null, Help opens on the device's default each time.
  private pickedTab: HelpTab | null = loadHelpTab();
  private tab: HelpTab;
  // Focus goes back where it was (the composer, say) when Help closes.
  private returnFocus: HTMLElement | null = null;

  constructor(private readonly source: HelpSource) {
    this.tabs = availableHelpTabs(helpTabSizes(source));
    this.tab = this.defaultTab();
    this.tabControl = this.tabs.length > 1 ? new HelpTabControl(this.tabs, BODY_ID, (tab: HelpTab): void => this.pickTab(tab)) : null;
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
    this.showTab(this.defaultTab());
    this.overlay.hidden = false;
    this.focusSearch();
  }

  close(): void {
    this.overlay.hidden = true;
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  private defaultTab(): HelpTab {
    return initialHelpTab(this.pickedTab, this.tabs, isTouchWeb());
  }

  // Clicked: the search keeps its words and takes the typing back.
  private pickTab(tab: HelpTab): void {
    this.rememberTab(tab);
    this.focusSearch();
  }

  // Arrowed: focus follows onto the new tab, so the arrows keep working from there.
  private stepTab(step: number): void {
    const tab: HelpTab = steppedHelpTab(this.tabs, this.tab, step);
    this.rememberTab(tab);
    this.tabControl?.focus(tab);
  }

  // Only a tab chosen by hand is stored; the device default never is, so a phone keeps opening on Questions.
  private rememberTab(tab: HelpTab): void {
    this.pickedTab = tab;
    saveHelpTab(tab);
    this.showTab(tab);
  }

  private showTab(tab: HelpTab): void {
    this.tab = tab;
    this.tabControl?.select(tab);
    this.body.setAttribute('aria-label', HELP_TAB_LABELS[tab]);
    this.search.placeholder = SEARCH_HINTS[tab];
    this.render();
  }

  // A touch screen would raise its keyboard over Help, so the panel takes focus instead and keys stay inside.
  private focusSearch(): void {
    if (isTouchWeb()) this.panel.focus({ preventScroll: true });
    else this.search.focus();
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.isOpen) return;
    const isInSearch: boolean = event.target === this.search;
    if (event.key === CLOSE_KEY) return this.consume(event, (): void => this.dismissStep());
    if (event.key === TOGGLE_KEY && !isInSearch) return this.consume(event, (): void => this.close());
    const step: number | undefined = TAB_STEPS[event.key];
    if (step !== undefined && this.tabControl?.contains(event.target) === true) return this.consume(event, (): void => this.stepTab(step));
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
    this.focusSearch();
  }

  private render(): void {
    const terms: readonly string[] = queryTerms(this.search.value);
    this.body.replaceChildren(...renderHelpContent(this.source, this.tab, this.search.value, terms, (tab: HelpTab): void => this.pickTab(tab)));
    this.body.scrollTop = 0;
  }

  private renderPanel(): HTMLElement {
    // Focusable only from code: on a touch screen it holds focus in place of the search.
    this.panel.tabIndex = -1;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-labelledby', HELP_TITLE_ID);
    this.body.id = BODY_ID;
    this.body.setAttribute('role', this.tabControl === null ? 'region' : 'tabpanel');
    this.panel.append(renderHelpHead(this.tabControl?.root ?? null, this.search, (): void => this.close()), this.body);
    return this.panel;
  }
}
