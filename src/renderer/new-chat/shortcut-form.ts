import { draftProblem, normalizeDraft } from '../../shared/shortcut-draft';
import type { ActionResult, ShortcutDraft } from '../../shared/types';
import { element } from '../dom';

export interface ShortcutFormActions {
  readonly saved: () => void;
  readonly cancel: () => void;
}

export type TakenLabels = () => readonly string[];

const CANCEL_KEY: string = 'Escape';

// The "Add shortcut" form inside the New chat menu: a label for the list, the new chat's name, and its folder.
export class ShortcutForm {
  readonly root: HTMLFormElement = element('form', 'shortcut-form');
  private readonly label: HTMLInputElement = textField('Claude acme');
  private readonly chatName: HTMLInputElement = textField('Same as the label');
  private readonly folder: HTMLInputElement = textField('/path/to/project');
  private readonly problem: HTMLParagraphElement = element('p', 'shortcut-problem');
  private readonly save: HTMLButtonElement = element('button', 'shortcut-save', 'Save');

  constructor(
    private readonly actions: ShortcutFormActions,
    private readonly takenLabels: TakenLabels,
  ) {
    this.root.noValidate = true;
    this.root.append(
      element('h3', 'shortcut-title', 'New Shortcut'),
      field('Label', this.label),
      field('Chat name', this.chatName),
      field('Folder', this.folder, this.renderChooseButton()),
      this.problem,
      this.renderButtons(),
    );
    this.root.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault();
      void this.submit();
    });
    // Escape leaves the form only; it must not also reach the board, which would close the chat panel.
    this.root.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== CANCEL_KEY) return;
      event.stopPropagation();
      this.actions.cancel();
    });
  }

  open(): void {
    for (const input of [this.label, this.chatName, this.folder]) input.value = '';
    this.showProblem(null);
    this.save.disabled = false;
    this.label.focus();
  }

  private renderChooseButton(): HTMLButtonElement {
    const choose: HTMLButtonElement = element('button', 'shortcut-choose', 'Choose…');
    choose.type = 'button';
    choose.addEventListener('click', (): void => void this.chooseFolder());
    return choose;
  }

  private renderButtons(): HTMLDivElement {
    const buttons: HTMLDivElement = element('div', 'shortcut-buttons');
    const cancel: HTMLButtonElement = element('button', 'shortcut-cancel', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', (): void => this.actions.cancel());
    this.save.type = 'submit';
    buttons.append(cancel, this.save);
    return buttons;
  }

  private async chooseFolder(): Promise<void> {
    const folder: string | null = await window.radar.chooseFolder();
    if (folder !== null) this.folder.value = folder;
  }

  // Checked here for instant feedback, and again in the main process, which also looks at the folder.
  private async submit(): Promise<void> {
    const draft: ShortcutDraft = normalizeDraft({ label: this.label.value, chatName: this.chatName.value, folder: this.folder.value });
    const problem: string | null = draftProblem(draft, this.takenLabels());
    if (problem !== null) return this.showProblem(problem);
    this.save.disabled = true;
    const result: ActionResult = await window.radar.addShortcut(draft);
    this.save.disabled = false;
    if (!result.ok) return this.showProblem(result.error ?? 'Could not save the shortcut.');
    this.actions.saved();
  }

  private showProblem(problem: string | null): void {
    this.problem.textContent = problem ?? '';
    this.problem.hidden = problem === null;
  }
}

function textField(placeholder: string): HTMLInputElement {
  const input: HTMLInputElement = element('input', 'shortcut-input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.spellcheck = false;
  return input;
}

function field(title: string, input: HTMLInputElement, extra?: HTMLElement): HTMLLabelElement {
  const row: HTMLLabelElement = element('label', 'shortcut-field');
  const control: HTMLDivElement = element('div', 'shortcut-control');
  control.append(input, ...(extra === undefined ? [] : [extra]));
  row.append(element('span', 'shortcut-field-title', title), control);
  return row;
}
