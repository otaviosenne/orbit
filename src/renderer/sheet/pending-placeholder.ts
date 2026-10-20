import { element, requireElement } from '../dom';
import type { PendingChat } from '../pending-chat';
import { chatColor, textOnChatColor } from '../palette';
import { renderSpinner } from '../spinner';

type BubbleSide = 'assistant' | 'user';

interface SkeletonBubble {
  readonly side: BubbleSide;
  // A share of the thread's width, varied so the placeholder reads as a conversation rather than a list.
  readonly width: string;
}

const SKELETON_BUBBLES: readonly SkeletonBubble[] = [
  { side: 'assistant', width: '74%' },
  { side: 'user', width: '42%' },
  { side: 'assistant', width: '61%' },
  { side: 'assistant', width: '35%' },
];
// What a chat that is still starting cannot do yet: take a new name or color, or show its window. The composer
// stays open: a message written meanwhile waits and goes out as soon as the chat is live.
const UNUSABLE_YET: readonly string[] = ['#action-focus', '#action-rename', '#action-color'];
const STARTING_CLASS: string = 'is-starting';

// The panel's stand-in for a chat that was just launched: its name and color in the header, shimmering
// bubbles in the thread, and an error with a Close button if it never starts.
export class PendingPlaceholder {
  private readonly overlay: HTMLDivElement = element('div', 'sheet-pending');
  private readonly name: HTMLElement = requireElement('#sheet-name');
  private readonly meta: HTMLElement = requireElement('#sheet-meta');
  private current: PendingChat | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly onClose: () => void,
  ) {
    this.overlay.hidden = true;
    requireElement('#sheet-messages').after(this.overlay);
  }

  get isActive(): boolean {
    return this.current !== null;
  }

  // A message sent before the chat is live, shown under the skeleton until it can be delivered.
  showQueued(text: string): void {
    const bubble: HTMLDivElement = element('div', 'message message-user is-pending sheet-pending-queued');
    bubble.append(element('span', 'message-meta', 'Sends when the chat is ready'), element('div', 'message-text', text));
    this.overlay.append(bubble);
  }

  show(chat: PendingChat): void {
    this.current = chat;
    this.name.textContent = chat.name;
    this.meta.replaceChildren(renderSpinner(), document.createTextNode('Starting…'));
    this.paint(chat.color);
    this.setUsable(false);
    this.overlay.replaceChildren(...SKELETON_BUBBLES.map(renderBubble));
    this.overlay.classList.remove('is-error');
    this.overlay.hidden = false;
  }

  // A resumed chat's color is read from its transcript, which can take a moment longer than opening the panel.
  recolor(launchedAt: number, color: string | null): void {
    if (this.current?.launchedAt !== launchedAt || color === null) return;
    this.current = { ...this.current, color };
    this.paint(color);
  }

  fail(launchedAt: number, message: string): void {
    if (this.current?.launchedAt !== launchedAt) return;
    this.meta.replaceChildren(document.createTextNode('Did not start'));
    const close: HTMLButtonElement = element('button', 'button', 'Close');
    close.type = 'button';
    close.addEventListener('click', this.onClose);
    this.overlay.classList.add('is-error');
    this.overlay.replaceChildren(element('p', 'sheet-pending-error', message), close);
  }

  // The live chat now owns the header and the actions; the bubbles stay until its transcript arrives,
  // so the thread never flashes empty in between.
  handOver(): void {
    this.current = null;
    this.setUsable(true);
  }

  clear(): void {
    this.handOver();
    this.overlay.hidden = true;
    this.overlay.replaceChildren();
  }

  private paint(color: string | null): void {
    this.root.style.setProperty('--chat', chatColor(color));
    this.root.style.setProperty('--on-chat', textOnChatColor(color));
  }

  private setUsable(isUsable: boolean): void {
    this.root.classList.toggle(STARTING_CLASS, !isUsable);
    for (const selector of UNUSABLE_YET) requireElement(selector).inert = !isUsable;
  }
}

function renderBubble(bubble: SkeletonBubble): HTMLDivElement {
  const row: HTMLDivElement = element('div', `sheet-pending-bubble is-${bubble.side}`);
  row.style.width = bubble.width;
  return row;
}
