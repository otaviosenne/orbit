import { MAX_TYPED_LENGTH } from '../../shared/remote-typing';
import type { TypingField } from '../../shared/typing-request';
import { element } from '../dom';

export interface TypingInput {
  readonly row: HTMLElement;
  readonly input: HTMLInputElement;
  readonly copy: HTMLButtonElement;
}

// A field already copied keeps its row so the user sees what is done, with nothing left to press.
export const COPIED_CLASS: string = 'is-done';

// One labeled input per field the chat asked for, with its own Copy button.
export function typingInput(field: TypingField, copied: boolean): TypingInput {
  const input: HTMLInputElement = textInput(field.label);
  const copy: HTMLButtonElement = copyButton(field.label, copied);
  input.disabled = copied;
  if (copied) input.placeholder = 'Copied';
  const line: HTMLElement = element('div', 'typing-line');
  line.append(input, copy);
  const row: HTMLElement = element('div', 'typing-row');
  row.classList.toggle(COPIED_CLASS, copied);
  row.append(element('span', 'typing-row-label', field.label), line);
  return { row, input, copy };
}

function copyButton(label: string, copied: boolean): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', copied ? `button ${COPIED_CLASS}` : 'button button-primary', copied ? 'Copied' : 'Copy');
  button.type = 'button';
  button.disabled = copied;
  button.setAttribute('aria-label', copied ? `${label}: copied` : `Copy ${label} to the PC clipboard`);
  return button;
}

// Plain text on purpose: the user wants to read what they write before it is copied. No autocorrect or capitals,
// which would quietly change a password on a phone keyboard.
function textInput(label: string): HTMLInputElement {
  const input: HTMLInputElement = element('input', 'typing-field');
  input.type = 'text';
  input.setAttribute('autocorrect', 'off');
  input.maxLength = MAX_TYPED_LENGTH;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', `${label}: text to copy to the PC`);
  input.placeholder = 'Type it here';
  return input;
}
