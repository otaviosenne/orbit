import { CARET_DOWN_ICON, CARET_UP_ICON } from '../icons';
import type { OlderHistory } from './paging/older-history';
import { searchOlder } from './paging/older-history';

// Hovering this long opens the preview; shorter passes of the pointer do not.
const PREVIEW_DELAY_MS: number = 500;
// Leaves a little air above the message after jumping to it.
const JUMP_MARGIN_PX: number = 12;
// Tolerance so the message just jumped to is not picked again by the next click.
const POSITION_EPSILON_PX: number = 4;
// Within this distance of the end, the thread counts as scrolled all the way down.
const END_THRESHOLD_PX: number = 24;
const USER_MESSAGE: string = '.message-user';

type Direction = 'up' | 'down';

export interface NavigatorElements {
  readonly thread: HTMLElement;
  readonly up: HTMLButtonElement;
  readonly down: HTMLButtonElement;
  readonly preview: HTMLElement;
}

// Floating up/down chevrons at the top of the thread: step through your own messages; a long hover previews one.
// Up also reaches messages older than the pages shown, bringing pages in until one of yours turns up.
export class MessageNavigator {
  private previewTimer: number | undefined;
  // Bumped whenever the pointer leaves, so a preview still searching older pages does not open afterwards.
  private hoverGeneration: number = 0;

  constructor(private readonly elements: NavigatorElements, private readonly history: OlderHistory | null = null) {
    this.setUp(elements.up, 'up', CARET_UP_ICON);
    this.setUp(elements.down, 'down', CARET_DOWN_ICON);
    elements.thread.addEventListener('scroll', (): void => this.refresh());
    // The thread is re-rendered on every poll; re-check whenever its content changes.
    new MutationObserver((): void => this.refresh()).observe(elements.thread, { childList: true });
    this.refresh();
  }

  private setUp(button: HTMLButtonElement, direction: Direction, icon: string): void {
    button.innerHTML = icon;
    button.addEventListener('click', (): void => void this.jump(direction));
    button.addEventListener('mouseenter', (): void => this.schedulePreview(direction));
    button.addEventListener('mouseleave', (): void => this.hidePreview());
  }

  // Your message just above the top edge (up), or the next one below it (down).
  private target(direction: Direction): HTMLElement | null {
    const { thread } = this.elements;
    const anchor: number = thread.scrollTop + JUMP_MARGIN_PX;
    const messages: HTMLElement[] = [...thread.querySelectorAll<HTMLElement>(USER_MESSAGE)];
    if (direction === 'up') return messages.filter((message: HTMLElement) => this.topOf(message) < anchor - POSITION_EPSILON_PX).at(-1) ?? null;
    return messages.find((message: HTMLElement) => this.topOf(message) > anchor + POSITION_EPSILON_PX) ?? null;
  }

  // Position inside the scrolled thread, measured on screen: offsetTop ignores the text zoom of each item.
  private topOf(message: HTMLElement): number {
    const { thread } = this.elements;
    return message.getBoundingClientRect().top - thread.getBoundingClientRect().top + thread.scrollTop;
  }

  private isAtEnd(): boolean {
    const { thread } = this.elements;
    return thread.scrollHeight - thread.scrollTop - thread.clientHeight < END_THRESHOLD_PX;
  }

  private refresh(): void {
    this.elements.up.hidden = this.target('up') === null && this.history?.canLoadOlder !== true;
    this.elements.down.hidden = this.isAtEnd();
  }

  // Up and down skip to your message above or below. Down with none below goes to the end of the thread;
  // up with none left anywhere goes to the oldest item.
  private async jump(direction: Direction): Promise<void> {
    const { thread } = this.elements;
    this.hidePreview();
    const loadedBefore: number = thread.childElementCount;
    const target: HTMLElement | null = await this.find(direction);
    const top: number = target === null ? (direction === 'up' ? 0 : thread.scrollHeight) : this.topOf(target) - JUMP_MARGIN_PX;
    // Pages just added above shifted the content under a smooth scroll's fixed destination, so jump straight there.
    thread.scrollTo({ top, behavior: thread.childElementCount === loadedBefore ? 'smooth' : 'instant' });
  }

  private find(direction: Direction): Promise<HTMLElement | null> {
    const find = (): HTMLElement | null => this.target(direction);
    if (direction === 'down' || this.history === null) return Promise.resolve(find());
    return searchOlder(find, this.history);
  }

  private schedulePreview(direction: Direction): void {
    window.clearTimeout(this.previewTimer);
    this.previewTimer = window.setTimeout((): void => void this.showPreview(direction), PREVIEW_DELAY_MS);
  }

  // A copy of the real bubble, so the preview looks exactly like the message it leads to.
  private async showPreview(direction: Direction): Promise<void> {
    const generation: number = this.hoverGeneration;
    const target: HTMLElement | null = await this.find(direction);
    if (target === null || generation !== this.hoverGeneration) return;
    this.elements.preview.replaceChildren(target.cloneNode(true));
    this.elements.preview.dataset['direction'] = direction;
    this.elements.preview.hidden = false;
  }

  private hidePreview(): void {
    this.hoverGeneration += 1;
    window.clearTimeout(this.previewTimer);
    this.elements.preview.hidden = true;
    this.elements.preview.replaceChildren();
  }
}
