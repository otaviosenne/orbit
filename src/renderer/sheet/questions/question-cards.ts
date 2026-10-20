import type { QuestionPicker } from '../../../shared/types';
import type { PickerActions } from './picker-card';
import { PickerCard } from './picker-card';

// The thread is rebuilt whenever its items change; the picker's card is kept while the same question is on screen,
// so what was picked or typed in it survives until it is sent.
export class QuestionCards {
  private card: { readonly key: string; readonly card: PickerCard } | null = null;

  render(picker: QuestionPicker, actions: PickerActions | null): HTMLElement {
    const key: string = pickerKey(picker);
    if (this.card?.key !== key) this.card = { key, card: new PickerCard(picker, actions) };
    return this.card.card.root;
  }

  clear(): void {
    this.card = null;
  }
}

export function pickerKey(picker: QuestionPicker | null): string {
  if (picker === null) return '';
  return picker.kind === 'unreadable' ? picker.kind : picker.fingerprint;
}
