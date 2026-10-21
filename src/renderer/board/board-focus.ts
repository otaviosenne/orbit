import { SESSION_ATTRIBUTE } from '../views/board-view';
import type { FocusCandidate, FocusDirection } from './spatial-nav';
import { firstInReadingOrder, nextInDirection } from './spatial-nav';

const FOCUS_CLASS: string = 'is-keyboard-focus';
const CARD_SELECTOR: string = `.card[data-${SESSION_ATTRIBUTE}]`;
const PINNED_ROW_SELECTOR: string = '.pinned-row';

interface FocusedCard {
  readonly key: string;
  readonly sessionId: string;
}

// The keyboard focus ring on the board. The board is rebuilt on every poll, so the ring is kept as a key
// (a pinned chat has two cards: the Pinned row's and its column's) and painted again after each render.
export class BoardFocus {
  private focused: FocusedCard | null = null;

  // Any press on the board means the pointer took over, so the ring goes away.
  constructor(private readonly root: HTMLElement) {
    root.addEventListener('pointerdown', (): void => void this.clear(), true);
  }

  // The focused chat while its card is on the board.
  get sessionId(): string | null {
    return this.focusedCard() === null ? null : (this.focused?.sessionId ?? null);
  }

  move(direction: FocusDirection): void {
    const cards: readonly HTMLElement[] = this.cards();
    const candidates: readonly FocusCandidate[] = cards.map(toCandidate);
    const current: FocusCandidate | undefined = candidates.find((candidate: FocusCandidate) => candidate.key === this.focused?.key);
    const next: FocusCandidate | null = current === undefined ? firstInReadingOrder(candidates) : nextInDirection(current, candidates, direction);
    const card: HTMLElement | undefined = cards.find((candidate: HTMLElement) => cardKey(candidate) === next?.key);
    if (card === undefined) return;
    this.focused = { key: cardKey(card), sessionId: card.dataset[SESSION_ATTRIBUTE] ?? '' };
    this.paint();
    card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  paint(): void {
    const current: HTMLElement | null = this.focusedCard();
    this.cards().forEach((card: HTMLElement): void => void card.classList.toggle(FOCUS_CLASS, card === current));
  }

  // Returns whether there was a ring to clear.
  clear(): boolean {
    if (this.focused === null) return false;
    this.focused = null;
    this.paint();
    return true;
  }

  private cards(): readonly HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(CARD_SELECTOR)];
  }

  private focusedCard(): HTMLElement | null {
    const key: string | undefined = this.focused?.key;
    return key === undefined ? null : (this.cards().find((card: HTMLElement) => cardKey(card) === key) ?? null);
  }
}

function cardArea(card: HTMLElement): string {
  return card.closest(PINNED_ROW_SELECTOR) === null ? 'board' : 'pinned';
}

function cardKey(card: HTMLElement): string {
  return `${cardArea(card)}:${card.dataset[SESSION_ATTRIBUTE] ?? ''}`;
}

function toCandidate(card: HTMLElement): FocusCandidate {
  return { key: cardKey(card), box: card.getBoundingClientRect(), area: cardArea(card) };
}
