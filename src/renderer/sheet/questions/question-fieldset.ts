import type { PickerChoice, QuestionAnswer } from '../../../shared/types';
import { element } from '../../dom';

const OTHER_LABEL: string = 'Other';
const OTHER_PLACEHOLDER: string = 'Type your own answer';

// One tab of the picker as Orbit shows it, with what is already ticked or typed in the terminal.
export interface FieldsetQuestion {
  readonly question: string;
  readonly header: string | null;
  readonly multiSelect: boolean;
  readonly options: readonly PickerChoice[];
  readonly other: string | null;
  // False where the picker has no "Type something" field (options with previews).
  readonly allowsOther: boolean;
}

// One question of the card: its header chip, the options as radio rows (checkboxes when several may be picked),
// and an "Other" row with a text field.
export class QuestionFieldset {
  readonly root: HTMLFieldSetElement = element('fieldset', 'question');
  private readonly choices: HTMLInputElement[];
  private readonly otherChoice: HTMLInputElement;
  private readonly otherText: HTMLInputElement = element('input', 'question-other-input');

  // name groups the radios of one question; onChange lets the card re-check whether it can be sent.
  constructor(private readonly question: FieldsetQuestion, name: string, onChange: () => void) {
    const type: string = question.multiSelect ? 'checkbox' : 'radio';
    this.choices = question.options.map((option: PickerChoice): HTMLInputElement => choiceInput(type, name, option.ticked));
    this.otherChoice = choiceInput(type, name, question.other !== null);
    this.otherText.type = 'text';
    this.otherText.value = question.other ?? '';
    this.otherText.placeholder = OTHER_PLACEHOLDER;
    // Typing an answer of your own is choosing "Other".
    this.otherText.addEventListener('input', (): void => {
      this.otherChoice.checked = this.otherText.value.trim().length > 0 || this.otherChoice.checked;
    });
    // On click, not change: picking "Other" again (or clicking its row) must still put the caret in the field,
    // or the keys meant for it land on the radio, where Space only re-picks it.
    this.otherChoice.addEventListener('click', (): void => {
      if (this.otherChoice.checked) this.otherText.focus();
    });
    this.root.addEventListener('input', onChange);
    this.root.addEventListener('change', onChange);
    this.root.append(this.legend(), ...question.options.map((option: PickerChoice, index: number) => optionRow(this.choices[index], option)));
    if (question.allowsOther) this.root.append(this.otherRow());
  }

  // null until the question has a usable answer: something picked, and text typed when "Other" is picked.
  read(): QuestionAnswer | null {
    const selected: number[] = this.choices.flatMap((choice: HTMLInputElement, index: number) => (choice.checked ? [index] : []));
    const other: string | null = this.otherChoice.checked ? this.otherText.value.trim() : null;
    if (other === '') return null;
    return selected.length > 0 || other !== null ? { selected, other } : null;
  }

  setDisabled(disabled: boolean): void {
    this.root.disabled = disabled;
  }

  private legend(): HTMLLegendElement {
    const legend: HTMLLegendElement = element('legend', 'question-legend');
    if (this.question.header !== null && this.question.header.length > 0) legend.append(element('span', 'question-chip', this.question.header));
    legend.append(element('span', 'question-text', this.question.question), element('span', 'question-hint', this.question.multiSelect ? 'Choose any' : 'Choose one'));
    return legend;
  }

  private otherRow(): HTMLLabelElement {
    const row: HTMLLabelElement = element('label', 'question-option question-other');
    const body: HTMLSpanElement = element('span', 'question-option-body');
    body.append(element('span', 'question-option-label', OTHER_LABEL), this.otherText);
    row.append(this.otherChoice, body);
    return row;
  }
}

function choiceInput(type: string, name: string, checked: boolean): HTMLInputElement {
  const input: HTMLInputElement = element('input', 'question-choice');
  input.type = type;
  input.name = name;
  input.checked = checked;
  return input;
}

function optionRow(choice: HTMLInputElement | undefined, option: PickerChoice): HTMLLabelElement {
  const row: HTMLLabelElement = element('label', 'question-option');
  const body: HTMLSpanElement = element('span', 'question-option-body');
  body.append(element('span', 'question-option-label', option.label));
  if (option.description.length > 0) body.append(element('span', 'question-option-description', option.description));
  if (choice !== undefined) row.append(choice);
  row.append(body);
  return row;
}
