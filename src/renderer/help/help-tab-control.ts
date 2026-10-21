import { element } from '../dom';
import type { HelpTab } from './help-tab';
import { HELP_TAB_LABELS } from './help-tab';

// Shortcuts | Questions, drawn like the timeline's range control and announced as tabs of the Help body.
export class HelpTabControl {
  readonly root: HTMLDivElement = element('div', 'range-control help-tabs');
  private readonly buttons: Map<HelpTab, HTMLButtonElement> = new Map();

  constructor(tabs: readonly HelpTab[], panelId: string, onSelect: (tab: HelpTab) => void) {
    this.root.setAttribute('role', 'tablist');
    this.root.setAttribute('aria-label', 'Help sections');
    tabs.forEach((tab: HelpTab): void => {
      const button: HTMLButtonElement = element('button', 'range-choice help-tab', HELP_TAB_LABELS[tab]);
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panelId);
      button.addEventListener('click', (): void => onSelect(tab));
      this.buttons.set(tab, button);
      this.root.append(button);
    });
  }

  contains(node: EventTarget | null): boolean {
    return node instanceof Node && this.root.contains(node);
  }

  select(tab: HelpTab): void {
    this.buttons.forEach((button: HTMLButtonElement, option: HelpTab): void => {
      const isSelected: boolean = option === tab;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-selected', String(isSelected));
    });
  }

  focus(tab: HelpTab): void {
    this.buttons.get(tab)?.focus();
  }
}
