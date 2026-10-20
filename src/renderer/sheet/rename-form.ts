import { requireElement } from '../dom';

export type RenameSubmitted = (name: string) => void;

// Swaps the chat title for an input while renaming.
export class RenameForm {
  private readonly form: HTMLFormElement = requireElement('#rename-form');
  private readonly input: HTMLInputElement = requireElement('#rename-input');
  private readonly title: HTMLElement = requireElement('#sheet-name');

  constructor(onSubmit: RenameSubmitted) {
    this.form.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault();
      onSubmit(this.input.value);
      this.close();
    });
    requireElement('#rename-cancel').addEventListener('click', (): void => this.close());
  }

  get isOpen(): boolean {
    return !this.form.hidden;
  }

  open(currentName: string): void {
    this.input.value = currentName;
    this.form.hidden = false;
    this.title.hidden = true;
    this.input.focus();
    this.input.select();
  }

  close(): void {
    this.form.hidden = true;
    this.title.hidden = false;
  }
}
