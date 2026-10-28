import type { SwitchConfirmation } from '../../../shared/types';
import { element } from '../../dom';

const CANCEL_KEY: string = 'Escape';
const DECLINE_LABEL: string = 'No, go back';

// Claude Code's "Switch model?" or "Change effort level?" question, asked again in Orbit: until it is answered the
// chat waits on it, and the change Orbit reported has not happened. Escape, the overlay and No keep things as they were.
export class SwitchPrompt {
  private readonly overlay: HTMLDivElement = element('div', 'dialog-overlay');
  private readonly title: HTMLHeadingElement = element('h3', 'dialog-title');
  private readonly note: HTMLParagraphElement = element('p', 'dialog-note');
  private readonly confirm: HTMLButtonElement = this.button('dialog-button is-primary', true);
  private settle: ((accept: boolean) => void) | null = null;

  constructor() {
    const dialog: HTMLDivElement = element('div', 'dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const decline: HTMLButtonElement = this.button('dialog-button', false);
    decline.textContent = DECLINE_LABEL;
    const actions: HTMLDivElement = element('div', 'dialog-actions');
    actions.append(this.confirm, decline);
    dialog.append(this.title, this.note, actions);
    this.overlay.hidden = true;
    this.overlay.append(dialog);
    document.body.append(this.overlay);
    // A press, not a click: a drag that starts in the dialog and ends on the overlay must not decline it.
    this.overlay.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (event.target === this.overlay) this.answer(false);
    });
    // Captured first, like Help: while the question is up the app behind it gets no keys.
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (this.settle === null) return;
      event.stopPropagation();
      if (event.key === CANCEL_KEY) this.answer(false);
    }, true);
  }

  ask(question: SwitchConfirmation): Promise<boolean> {
    this.answer(false);
    this.title.textContent = question.title;
    this.note.textContent = question.detail;
    this.confirm.textContent = question.confirmLabel;
    this.overlay.hidden = false;
    this.confirm.focus();
    return new Promise((resolve: (accept: boolean) => void): void => {
      this.settle = resolve;
    });
  }

  private answer(accept: boolean): void {
    const settle: ((accept: boolean) => void) | null = this.settle;
    this.settle = null;
    this.overlay.hidden = true;
    settle?.(accept);
  }

  private button(className: string, accept: boolean): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', className);
    button.type = 'button';
    button.addEventListener('click', (): void => this.answer(accept));
    return button;
  }
}
