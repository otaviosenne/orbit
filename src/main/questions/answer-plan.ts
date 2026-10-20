import type { PickerChoice, PickerQuestionView, QuestionAnswer } from '../../shared/types';
import type { PickerStep } from './picker-keys';
import { clearField, climbToField, climbToFirstOption, keys, optionDigit, parkAtBottom, text } from './picker-keys';

// Lines in the "Type something" field would submit it early.
const LINE_BREAKS: RegExp = /[\r\n\t]+/g;
// Other control characters would act as keys inside the picker.
const CONTROL_CHARACTERS: RegExp = /[\u0000-\u001f\u007f]/g;

// The keys that answer the tab on screen and move the picker on (to the next tab, the review, or sending it).
// Every tab starts from the bottom row, so wherever the cursor was left does not matter.
export function tabSteps(view: PickerQuestionView, answer: QuestionAnswer): PickerStep[] {
  if (view.multiSelect) return multiSelectSteps(view, answer);
  const other: string | null = cleanOther(answer.other);
  if (other !== null) return [parkAtBottom(view), climbToField(view), clearField(), text(other), keys('enter')];
  return [parkAtBottom(view), climbToFirstOption(view), text(optionDigit(answer.selected[0] ?? 0))];
}

// Digits toggle without moving the cursor, so only boxes that differ from the screen are pressed.
// The field is always cleared, so text typed earlier never rides along.
function multiSelectSteps(view: PickerQuestionView, answer: QuestionAnswer): PickerStep[] {
  const other: string | null = cleanOther(answer.other);
  const toggles: PickerStep[] = view.options
    .map((option: PickerChoice, index: number) => (option.ticked === answer.selected.includes(index) ? null : text(optionDigit(index))))
    .filter((step: PickerStep | null): step is PickerStep => step !== null);
  return [
    parkAtBottom(view),
    climbToFirstOption(view),
    ...toggles,
    parkAtBottom(view),
    climbToField(view),
    clearField(),
    ...(other === null ? [] : [text(other)]),
    // The multi-select "Submit" row sits right under the field.
    keys('down'),
    keys('enter'),
  ];
}

export function cleanOther(other: string | null): string | null {
  if (other === null) return null;
  const cleaned: string = other.replace(LINE_BREAKS, ' ').replace(CONTROL_CHARACTERS, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}
