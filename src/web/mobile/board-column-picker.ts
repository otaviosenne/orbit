import type { ColumnKey } from '../../renderer/views/board-columns';
import { element } from '../../renderer/dom';

interface ColumnChoice {
  readonly key: ColumnKey;
  readonly label: string;
}

// The board's columns in its own order, with its own titles.
export const COLUMN_CHOICES: readonly ColumnChoice[] = [
  { key: 'needs', label: 'Needs you' },
  { key: 'busy', label: 'Working' },
  { key: 'active', label: 'Active' },
  { key: 'idle', label: 'Idle' },
];

const STORAGE_KEY: string = 'orbit-web.board-column';
const COLUMN_ATTRIBUTE: string = 'boardColumn';
const ON_BOARD_CLASS: string = 'web-on-board';
const DEFAULT_COLUMN: ColumnKey = 'needs';

// A segmented control above the board on narrow screens. The board is rebuilt on every poll, so the chosen column
// lives on <body> (which survives) and CSS shows only that column.
export class BoardColumnPicker {
  readonly root: HTMLDivElement = element('div', 'web-columns');
  private readonly buttons: Map<ColumnKey, HTMLButtonElement> = new Map();
  private current: ColumnKey = loadColumn();

  constructor(private readonly view: HTMLElement) {
    this.root.setAttribute('role', 'tablist');
    for (const choice of COLUMN_CHOICES) this.root.append(this.renderButton(choice));
    view.before(this.root);
    new MutationObserver((): void => this.follow()).observe(view, { childList: true });
    this.select(this.current);
  }

  // Swiping moves one column over; it stops at either end rather than wrapping.
  step(direction: 1 | -1): void {
    const index: number = COLUMN_CHOICES.findIndex((choice: ColumnChoice) => choice.key === this.current);
    const next: ColumnChoice | undefined = COLUMN_CHOICES[index + direction];
    if (next !== undefined) this.select(next.key);
  }

  private renderButton(choice: ColumnChoice): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', 'web-column');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.append(element('span', 'web-column-label', choice.label), element('span', 'web-column-count'));
    button.addEventListener('click', (): void => this.select(choice.key));
    this.buttons.set(choice.key, button);
    return button;
  }

  private select(key: ColumnKey): void {
    this.current = key;
    document.body.dataset[COLUMN_ATTRIBUTE] = key;
    for (const [column, button] of this.buttons) {
      button.classList.toggle('is-active', column === key);
      button.setAttribute('aria-selected', String(column === key));
    }
    saveColumn(key);
  }

  // Counts are read off the board that was just drawn, so they always match what the columns hold.
  private follow(): void {
    const onBoard: boolean = this.view.querySelector('.board') !== null;
    document.body.classList.toggle(ON_BOARD_CLASS, onBoard);
    if (!onBoard) return;
    for (const [column, button] of this.buttons) {
      const count: string = this.view.querySelector(`.column-${column} .column-count`)?.textContent ?? '0';
      const badge: Element | null = button.querySelector('.web-column-count');
      if (badge !== null) badge.textContent = count;
      button.classList.toggle('has-items', count !== '0');
    }
  }
}

function loadColumn(): ColumnKey {
  try {
    const saved: string | null = localStorage.getItem(STORAGE_KEY);
    return COLUMN_CHOICES.find((choice: ColumnChoice) => choice.key === saved)?.key ?? DEFAULT_COLUMN;
  } catch {
    return DEFAULT_COLUMN;
  }
}

function saveColumn(key: ColumnKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Remembered for this visit only.
  }
}
