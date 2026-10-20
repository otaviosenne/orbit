import { element } from '../../dom';
import type { ColumnKey } from '../board-columns';

// Replaces the grid's chats in one go: none, all, or one of the board's columns.
export type QuickSelection = 'none' | 'all' | ColumnKey;

interface QuickSelectOption {
  readonly selection: QuickSelection;
  readonly label: string;
}

const OPTIONS: readonly QuickSelectOption[] = [
  { selection: 'all', label: 'All' },
  { selection: 'none', label: 'None' },
  { selection: 'needs', label: 'Needs you' },
  { selection: 'busy', label: 'Working' },
  { selection: 'active', label: 'Active' },
  { selection: 'idle', label: 'Idle' },
];

// A row of small pills under the sidebar's title.
export function renderQuickSelect(onSelect: (selection: QuickSelection) => void): HTMLElement {
  const bar: HTMLDivElement = element('div', 'grid-quick-select');
  bar.append(...OPTIONS.map((option: QuickSelectOption): HTMLButtonElement => {
    const button: HTMLButtonElement = element('button', 'grid-quick-pill', option.label);
    button.type = 'button';
    button.title = option.selection === 'none' ? 'Clear the grid' : `Show only these chats (${option.label})`;
    button.addEventListener('click', (): void => onSelect(option.selection));
    return button;
  }));
  return bar;
}
