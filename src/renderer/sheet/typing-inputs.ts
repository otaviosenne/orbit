import { MAX_TYPED_LENGTH } from '../../shared/remote-typing';
import type { TypingField } from '../../shared/typing-request';
import { element } from '../dom';

export interface TypingInput {
  readonly row: HTMLLabelElement;
  readonly input: HTMLInputElement;
}

// One labeled input per field the chat asked for, in the order Orbit types them.
export function typingInput(field: TypingField): TypingInput {
  const input: HTMLInputElement = textInput(field.label);
  const row: HTMLLabelElement = element('label', 'typing-row');
  row.append(element('span', 'typing-row-label', field.label), input);
  return { row, input };
}

// Plain text on purpose: the user wants to read what they write before it is typed. No autocorrect or capitals, which
// would quietly change a password on a phone keyboard.
function textInput(label: string): HTMLInputElement {
  const input: HTMLInputElement = element('input', 'typing-field');
  input.type = 'text';
  input.setAttribute('autocorrect', 'off');
  input.maxLength = MAX_TYPED_LENGTH;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', `${label}: text to type on the PC`);
  input.placeholder = 'Type it here';
  return input;
}
