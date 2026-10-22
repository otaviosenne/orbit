import type { MessageItem, TranscriptItem } from '../../shared/types';
import { element } from '../dom';
import { renderMessage } from '../sheet/transcript/message-bubble';
import { lastMessage } from './last-message';

// Resting on a card this long opens the preview; passing over cards on the way somewhere else does not.
const HOVER_DELAY_MS: number = 500;
// Time to carry the pointer from the card onto the open preview before leaving the card closes it.
const LEAVE_GRACE_MS: number = 150;
// Enough recent items to find the last message behind a run of tool calls.
const RECENT_ITEMS: number = 40;
// Offset from the pointer, so the preview opens beside it without covering what it rests on.
const POINTER_OFFSET_PX: number = 14;
// Kept this far from the window's edges.
const EDGE_PX: number = 10;
const CARD_SELECTOR: string = '.card[data-session]';
const COLOR_PROPERTIES: readonly string[] = ['--chat', '--on-chat'];

// Hovering a board card for a moment shows its chat's last message beside it, in the chat's own bubble colors, the
// same way the thread's chevrons preview the message they lead to. Cards are rebuilt every poll, so the hover is
// tracked by chat, not by element.
export class CardPreview {
  private readonly root: HTMLDivElement = element('div', 'card-preview');
  private hovered: string | null = null;
  // Where the pointer came to rest: wide cards made a preview at the card's edge open far from it.
  private pointerX: number = 0;
  private pointerY: number = 0;
  private timer: number | null = null;
  private leaveTimer: number | null = null;
  // Bumped on every change of hover, so a transcript that arrives late is not shown for a card already left.
  private generation: number = 0;

  constructor(private readonly board: HTMLElement) {
    this.root.hidden = true;
    document.body.append(this.root);
    board.addEventListener('pointermove', (event: PointerEvent): void => this.track(event));
    board.addEventListener('pointerleave', (): void => this.leaveSoon());
    // The open preview can be hovered, scrolled and selected from; leaving it closes it.
    this.root.addEventListener('pointerenter', (): void => this.cancelLeave());
    this.root.addEventListener('pointerleave', (): void => this.leaveSoon());
    for (const type of ['pointerdown', 'wheel', 'keydown'] as const) {
      document.addEventListener(type, (event: Event): void => {
        if (!this.root.contains(event.target as Node)) this.leave();
      }, true);
    }
  }

  private track(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const card: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(CARD_SELECTOR);
    const sessionId: string | null = card?.dataset['session'] ?? null;
    if (sessionId === null) return this.leaveSoon();
    this.cancelLeave();
    // Once open, the preview stays while the pointer wanders over the same card.
    if (sessionId === this.hovered && !this.root.hidden) return;
    // Until then any movement restarts the wait: the preview is for a pointer that has come to rest.
    this.hovered = sessionId;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.hide();
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout((): void => void this.show(sessionId), HOVER_DELAY_MS);
  }

  // Leaving the card (or the preview) closes it unless the pointer reaches the preview (or the card) right away.
  private leaveSoon(): void {
    if (this.root.hidden) return this.leave();
    this.cancelLeave();
    this.leaveTimer = window.setTimeout((): void => this.leave(), LEAVE_GRACE_MS);
  }

  private cancelLeave(): void {
    if (this.leaveTimer !== null) window.clearTimeout(this.leaveTimer);
    this.leaveTimer = null;
  }

  private leave(): void {
    this.cancelLeave();
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
    // The card is only read for its colors; the preview opens at the pointer.
    for (const property of COLOR_PROPERTIES) this.root.style.setProperty(property, card.style.getPropertyValue(property));
    this.root.replaceChildren(renderMessage(message, (): undefined => undefined));
    this.root.hidden = false;
    this.place();
  }

  // Below and right of the pointer, flipped to the other side where the window runs out.
  private place(): void {
    const preview: DOMRect = this.root.getBoundingClientRect();
    const right: number = this.pointerX + POINTER_OFFSET_PX;
    const below: number = this.pointerY + POINTER_OFFSET_PX;
    const left: number = right + preview.width <= window.innerWidth - EDGE_PX ? right : this.pointerX - POINTER_OFFSET_PX - preview.width;
    // A tall message slides up until it fits, rather than leaving the window; one taller than the window starts at its top.
    const top: number = Math.min(below, window.innerHeight - EDGE_PX - preview.height);
    this.root.style.left = `${Math.max(EDGE_PX, left)}px`;
    this.root.style.top = `${Math.max(EDGE_PX, top)}px`;
  }

}
