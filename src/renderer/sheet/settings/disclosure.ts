import { element } from '../../dom';
import { CARET_DOWN_ICON } from '../../icons';

export type SectionKey = 'model' | 'effort' | 'permissions' | 'skills';

const OPEN_CLASS: string = 'is-open';

// One collapsed row of the settings popover, "Title · value", that unfolds its controls when clicked.
export class Disclosure {
  readonly root: HTMLElement = element('section', 'chat-settings-section chat-settings-disclosure');
  readonly body: HTMLDivElement = element('div', 'chat-settings-body');
  private readonly header: HTMLButtonElement = element('button', 'chat-settings-row');
  private readonly value: HTMLSpanElement = element('span', 'chat-settings-current');

  constructor(title: string, onToggle: () => void) {
    this.header.type = 'button';
    const caret: HTMLSpanElement = element('span', 'chat-settings-caret');
    caret.innerHTML = CARET_DOWN_ICON;
    this.header.append(element('span', 'chat-settings-title', title), this.value, caret);
    this.header.addEventListener('click', onToggle);
    this.root.append(this.header, this.body);
    this.setOpen(false);
  }

  setValue(text: string): void {
    this.value.textContent = text;
  }

  setOpen(isOpen: boolean): void {
    this.body.hidden = !isOpen;
    this.root.classList.toggle(OPEN_CLASS, isOpen);
    this.header.setAttribute('aria-expanded', String(isOpen));
  }
}
