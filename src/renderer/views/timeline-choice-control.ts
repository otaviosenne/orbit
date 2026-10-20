import { element } from '../dom';

export interface TimelineChoice {
  readonly value: string;
  readonly label: string;
}

// A compact macOS-style segmented control; app.ts finds the picked value through the data attribute,
// since the timeline is rebuilt on every poll.
export function renderChoiceControl(ariaLabel: string, choices: readonly TimelineChoice[], current: string, attribute: string): HTMLElement {
  const control: HTMLDivElement = element('div', 'range-control');
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', ariaLabel);
  control.append(...choices.map((choice: TimelineChoice) => renderChoice(choice, choice.value === current, attribute)));
  return control;
}

function renderChoice(choice: TimelineChoice, isSelected: boolean, attribute: string): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', `range-choice${isSelected ? ' is-selected' : ''}`, choice.label);
  button.dataset[attribute] = choice.value;
  button.setAttribute('aria-pressed', String(isSelected));
  return button;
}
