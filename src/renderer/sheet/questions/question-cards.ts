import type { QuestionPicker } from '../../../shared/types';
import type { PickerActions } from './picker-card';
import { PickerCard } from './picker-card';
import { QuestionSetCard } from './question-set-card';

// The thread is rebuilt whenever its items change; the picker's card is kept while the same question is on screen,
// so what was picked or typed in it survives until it is sent.
export class QuestionCards {
  private card: { readonly key: string; readonly root: HTMLElement } | null = null;

  render(picker: QuestionPicker, actions: PickerActions): HTMLElement {
    const key: string = pickerKey(picker);
    if (this.card?.key !== key) this.card = { key, root: buildCard(picker, actions) };
    return this.card.root;
  }

  clear(): void {
    this.card = null;
  }
}

export function pickerKey(picker: QuestionPicker | null): string {
  if (picker === null) return '';
  if (picker.kind === 'set') return `set:${picker.questionId}`;
  return picker.kind === 'unreadable' ? picker.kind : picker.fingerprint;
}

// A whole set (known from the transcript) steps through every question; otherwise the card mirrors the screen.
function buildCard(picker: QuestionPicker, actions: PickerActions): HTMLElement {
  return picker.kind === 'set' ? new QuestionSetCard(picker, actions).root : new PickerCard(picker, actions).root;
}
