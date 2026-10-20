import { element } from '../../dom';

export interface SegmentOption<T> {
  readonly value: T;
  readonly label: string;
}

// A labelled macOS-style segmented control, drawn like the timeline's range control. The selection is set from
// outside so it always mirrors the stored layout.
export class SegmentedControl<T> {
  readonly root: HTMLElement = element('div', 'segmented-field');
  private readonly buttons: Map<T, HTMLButtonElement> = new Map();

  constructor(label: string, options: readonly SegmentOption<T>[], onSelect: (value: T) => void) {
    const track: HTMLDivElement = element('div', 'range-control');
    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', label);
    options.forEach((option: SegmentOption<T>): void => {
      const button: HTMLButtonElement = element('button', 'range-choice', option.label);
      button.type = 'button';
      button.addEventListener('click', (): void => onSelect(option.value));
      this.buttons.set(option.value, button);
      track.append(button);
    });
    this.root.append(element('span', 'segmented-label', label), track);
  }

  select(value: T): void {
    this.buttons.forEach((button: HTMLButtonElement, option: T): void => {
      const isSelected: boolean = option === value;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }
}
