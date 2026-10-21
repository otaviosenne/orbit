import type { MessageItem, TranscriptItem } from '../../shared/types';
import { element } from '../dom';
import { renderMessage } from '../sheet/transcript/message-bubble';
import { lastMessage } from './last-message';

// Resting on a card this long opens the preview; passing over cards on the way somewhere else does not.
const HOVER_DELAY_MS: number = 500;
// Enough recent items to find the last message behind a run of tool calls.
const RECENT_ITEMS: number = 40;
// Room between the card and the preview, and from the window's edge.
const GAP_PX: number = 10;
const CARD_SELECTOR: string = '.card[data-session]';
const COLOR_PROPERTIES: readonly string[] = ['--chat', '--on-chat'];
const CLIPPED_CLASS: string = 'is-clipped';

// Hovering a board card for a moment shows its chat's last message beside it, in the chat's own bubble colors, the
// same way the thread's chevrons preview the message they lead to. Cards are rebuilt every poll, so the hover is
// tracked by chat, not by element.
export class CardPreview {
  private readonly root: HTMLDivElement = element('div', 'card-preview');
  private hovered: string | null = null;
  private timer: number | null = null;
  // Bumped on every change of hover, so a transcript that arrives late is not shown for a card already left.
  private generation: number = 0;

  constructor(private readonly board: HTMLElement) {
    this.root.hidden = true;
    document.body.append(this.root);
    board.addEventListener('pointermove', (event: PointerEvent): void => this.track(event));
    board.addEventListener('pointerleave', (): void => this.leave());
    for (const type of ['pointerdown', 'wheel', 'keydown'] as const) document.addEventListener(type, (): void => this.leave(), true);
  }

  private track(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const card: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(CARD_SELECTOR);
    const sessionId: string | null = card?.dataset['session'] ?? null;
    if (sessionId === null) return this.leave();
    // Once open, the preview stays while the pointer wanders over the same card.
    if (sessionId === this.hovered && !this.root.hidden) return;
    // Until then any movement restarts the wait: the preview is for a pointer that has come to rest.
    this.hovered = sessionId;
    this.hide();
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout((): void => void this.show(sessionId), HOVER_DELAY_MS);
  }

  private leave(): void {
    this.hovered = null;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.hide();
  }

  private hide(): void {
    this.generation += 1;
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  private async show(sessionId: string): Promise<void> {
    const generation: number = this.generation;
    const items: TranscriptItem[] = await window.radar.getTranscript(sessionId, RECENT_ITEMS).catch((): TranscriptItem[] => []);
    const message: MessageItem | null = lastMessage(items);
    const card: HTMLElement | null = this.board.querySelector<HTMLElement>(`${CARD_SELECTOR}[data-session="${CSS.escape(sessionId)}"]`);
    if (message === null || card === null || generation !== this.generation || this.hovered !== sessionId) return;
    for (const property of COLOR_PROPERTIES) this.root.style.setProperty(property, card.style.getPropertyValue(property));
    this.root.replaceChildren(renderMessage(message, (): undefined => undefined));
    this.root.hidden = false;
    this.root.classList.toggle(CLIPPED_CLASS, this.root.scrollHeight > this.root.clientHeight);
    this.place(card.getBoundingClientRect());
  }

  // Beside the card, on whichever side has room, kept inside the window.
  private place(card: DOMRect): void {
    const preview: DOMRect = this.root.getBoundingClientRect();
    const fitsRight: boolean = card.right + GAP_PX + preview.width <= window.innerWidth - GAP_PX;
    const left: number = fitsRight ? card.right + GAP_PX : Math.max(GAP_PX, card.left - GAP_PX - preview.width);
    const top: number = Math.min(Math.max(GAP_PX, card.top), window.innerHeight - GAP_PX - preview.height);
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
  }
}
