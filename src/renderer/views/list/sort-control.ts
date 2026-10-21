import { element } from '../../dom';
import type { ListSortMode } from './list-order';

interface SortChoice {
  readonly mode: ListSortMode;
  readonly label: string;
}

const SORT_CHOICES: readonly SortChoice[] = [
  { mode: 'name', label: 'A–Z' },
  { mode: 'manual', label: 'Manual' },
];

// The Timeline's segmented look, but built once and updated in place: the list is not rebuilt every poll, so a
// focused choice keeps its focus.
export class SortControl {
  readonly root: HTMLDivElement = element('div', 'range-control list-sort');
  private readonly buttons: Map<ListSortMode, HTMLButtonElement> = new Map();

  constructor(current: ListSortMode, choose: (mode: ListSortMode) => void) {
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Sort chats');
    for (const choice of SORT_CHOICES) this.root.append(this.renderChoice(choice, choose));
    this.select(current);
  }

  select(mode: ListSortMode): void {
    for (const [choice, button] of this.buttons) {
      button.classList.toggle('is-selected', choice === mode);
      button.setAttribute('aria-pressed', String(choice === mode));
    }
  }

  private renderChoice(choice: SortChoice, choose: (mode: ListSortMode) => void): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', 'range-choice', choice.label);
    button.type = 'button';
    button.addEventListener('click', (): void => choose(choice.mode));
    this.buttons.set(choice.mode, button);
    return button;
  }
}
