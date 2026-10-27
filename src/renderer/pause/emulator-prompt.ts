import { element } from '../dom';
import type { EmulatorAnswer } from './pause-flow';

const CANCEL_KEY: string = 'Escape';

// The question that comes with "Pause all chats" when emulators are open: a centered dialog over a dim overlay. Escape, the
// overlay and Cancel all leave the chats as they were.
export class EmulatorPrompt {
  private readonly overlay: HTMLDivElement = element('div', 'dialog-overlay');
  private readonly title: HTMLHeadingElement = element('h3', 'dialog-title');
  private readonly note: HTMLParagraphElement = element('p', 'dialog-note');
  private settle: ((answer: EmulatorAnswer) => void) | null = null;

  constructor() {
    const dialog: HTMLDivElement = element('div', 'dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const actions: HTMLDivElement = element('div', 'dialog-actions');
    actions.append(
      this.button('dialog-button is-destructive', 'Close emulators too', 'close'),
      this.button('dialog-button', 'Only pause chats', 'keep'),
      this.button('dialog-button', 'Cancel', 'cancel'),
    );
    dialog.append(this.title, this.note, actions);
    this.overlay.hidden = true;
    this.overlay.append(dialog);
    document.body.append(this.overlay);
    // A press, not a click: a drag that starts in the dialog and ends on the overlay must not cancel it.
    this.overlay.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (event.target === this.overlay) this.answer('cancel');
    });
    // Captured first, like Help: while the question is up the app behind it gets no keys.
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (this.settle === null) return;
      event.stopPropagation();
      if (event.key === CANCEL_KEY) this.answer('cancel');
    }, true);
  }

  ask(labels: readonly string[]): Promise<EmulatorAnswer> {
    this.answer('cancel');
    this.title.textContent = labels.length === 1 ? 'Close the emulator too?' : `Close the ${labels.length} emulators too?`;
    this.note.textContent = `Open now: ${labels.join(', ')}. Closing shuts them down without saving their state.`;
    this.overlay.hidden = false;
    return new Promise((resolve: (answer: EmulatorAnswer) => void): void => {
      this.settle = resolve;
    });
  }

  private answer(answer: EmulatorAnswer): void {
    const settle: ((answer: EmulatorAnswer) => void) | null = this.settle;
    this.settle = null;
    this.overlay.hidden = true;
    settle?.(answer);
  }

  private button(className: string, label: string, answer: EmulatorAnswer): HTMLButtonElement {
    const button: HTMLButtonElement = element('button', className, label);
    button.type = 'button';
    button.addEventListener('click', (): void => this.answer(answer));
    return button;
  }
}
