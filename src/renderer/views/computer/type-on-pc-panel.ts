import type { TypingTarget } from '../../../shared/remote-typing';
import { MAX_TYPED_LENGTH } from '../../../shared/remote-typing';
import type { ActionResult } from '../../../shared/types';
import { element } from '../../dom';
import { actionButton, group, row, rowText, subheading, switchInput, switchRow } from './computer-controls';

const NOTE: string = 'Focus the field in a browser on the PC first. Orbit types only when you press the button, only into a browser, and keeps nothing.';

// "Type on the PC": the field lives as long as the page, so the page's redraws never drop what is half typed.
export class TypeOnPcPanel {
  private target: TypingTarget | null = null;
  private pressEnter: boolean = true;
  private result: string | null = null;
  private readonly field: HTMLInputElement = passwordField();

  constructor(private readonly send: (text: string, pressEnter: boolean) => Promise<ActionResult>, private readonly changed: () => void) {
    this.field.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === 'Enter') void this.submit();
    });
  }

  // Typing in the field holds the page still, like a slider under the finger.
  get isEditing(): boolean {
    return document.activeElement === this.field;
  }

  update(target: TypingTarget | null): void {
    this.target = target;
  }

  render(): HTMLElement[] {
    const target: TypingTarget | null = this.target;
    const where: string = target === null ? 'Checking the PC…' : target.accepts ? `${target.app}${target.title ? ` · ${target.title}` : ''}` : (target.refusal ?? 'Not here');
    const enter: HTMLInputElement = switchInput(this.pressEnter, (isOn: boolean): void => {
      this.pressEnter = isOn;
    }, 'Press Enter after');
    const button: HTMLButtonElement = actionButton('Type on PC', (): void => void this.submit(), 'button button-primary');
    button.disabled = target?.accepts !== true;
    const rows: HTMLElement[] = [
      row('computer-action-row', rowText('Types into', where)),
      row('computer-action-row type-on-pc-row', this.field, button),
      switchRow('Press Enter after', 'Signs in right after the password', enter),
    ];
    const parts: HTMLElement[] = [subheading('Type on the PC'), group(...rows), element('p', 'settings-note', NOTE)];
    if (this.result !== null) parts.splice(2, 0, element('p', 'settings-note', this.result));
    return parts;
  }

  private async submit(): Promise<void> {
    const text: string = this.field.value;
    if (text.length === 0 || this.target?.accepts !== true) return;
    // Cleared before the answer comes back, so the text is gone from the page whatever happens next.
    this.field.value = '';
    this.field.blur();
    const answer: ActionResult = await this.send(text, this.pressEnter);
    this.result = answer.ok ? `Typed into ${this.target?.app ?? 'the PC'}.` : `Failed: ${answer.error ?? 'unknown error'}`;
    this.changed();
  }
}

function passwordField(): HTMLInputElement {
  const field: HTMLInputElement = element('input', 'type-on-pc-field');
  field.type = 'password';
  field.maxLength = MAX_TYPED_LENGTH;
  field.autocomplete = 'off';
  field.spellcheck = false;
  field.setAttribute('autocapitalize', 'off');
  field.setAttribute('aria-label', 'Text to type on the PC');
  field.placeholder = 'Password or text';
  return field;
}
