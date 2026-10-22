import { element } from '../dom';

export interface ConfirmChoice {
  readonly confirmLabel: string;
  // A line above the buttons saying what confirming will do, for when the label alone does not.
  readonly note?: string;
  readonly onConfirm: () => void;
}

const OPEN_CLASS: string = 'is-open';
const CLOSE_KEY: string = 'Escape';
const GAP_PX: number = 6;

// A small Confirm / Cancel popover anchored above a button, in the card menu's style; any click elsewhere or
// Escape cancels it.
export class ConfirmPopover {
  private readonly root: HTMLDivElement = element('div', 'card-menu confirm-popover');
  private readonly note: HTMLParagraphElement = element('p', 'confirm-popover-note');
  private choice: ConfirmChoice | null = null;

  constructor() {
    const confirm: HTMLButtonElement = this.button('card-menu-item is-destructive confirm-popover-yes', (): void => this.confirm());
    const cancel: HTMLButtonElement = this.button('card-menu-item', (): void => void this.dismiss(), 'Cancel');
    this.note.hidden = true;
    this.root.append(this.note, confirm, cancel);
    document.body.append(this.root);
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (!this.root.contains(event.target as Node)) this.dismiss();
    }, true);
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY && this.dismiss()) event.stopPropagation();
    }, true);
  }

  open(anchor: HTMLElement, choice: ConfirmChoice): void {
    this.choice = choice;
    const label: HTMLElement | null = this.root.querySelector('.confirm-popover-yes span');
    if (label !== null) label.textContent = choice.confirmLabel;
    this.note.textContent = choice.note ?? '';
    this.note.hidden = choice.note === undefined;
    this.root.classList.add(OPEN_CLASS);
    const box: DOMRect = anchor.getBoundingClientRect();
    const left: number = Math.min(box.left, window.innerWidth - this.root.offsetWidth - GAP_PX);
    this.root.style.left = `${Math.max(GAP_PX, left)}px`;
    this.root.style.top = `${Math.max(GAP_PX, box.top - this.root.offsetHeight - GAP_PX)}px`;
  }

  // Returns whether it was open, so Escape is used up here rather than also closing the panel.
  dismiss(): boolean {
    if (this.choice === null) return false;
    this.choice = null;
    this.root.classList.remove(OPEN_CLASS);
    return true;
  }

  private confirm(): void {
    const choice: ConfirmChoice | null = this.choice;
    this.dismiss();
    choice?.onConfirm();
  }

  private button(className: string, onClick: () => void, label: string = ''): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', className);
    button.type = 'button';
    button.append(element('span', '', label));
    button.addEventListener('click', onClick);
    return button;
  }
}
