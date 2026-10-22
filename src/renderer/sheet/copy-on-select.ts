import { element } from '../dom';
import { isTouchWeb } from '../host';
import { COPY_ICON } from '../icons';

// Long enough to read; it sits in the window's corner, out of the way of the text being read.
const TOAST_MS: number = 1200;
const TOAST_TEXT: string = 'Copied';

// Selecting text in the thread copies it, like a terminal: no Ctrl+C needed. A phone keeps its own selection menu.
export function installCopyOnSelect(thread: HTMLElement): void {
  if (isTouchWeb()) return;
  thread.addEventListener('mouseup', (): void => {
    const text: string = selectedTextIn(thread);
    if (text.length === 0) return;
    void navigator.clipboard.writeText(text).then((): void => showToast(), (): void => undefined);
  });
}

// Only a selection that lies in the thread counts; one that started in the composer or elsewhere is left alone.
function selectedTextIn(thread: HTMLElement): string {
  const selection: Selection | null = window.getSelection();
  if (selection === null || selection.isCollapsed || selection.rangeCount === 0) return '';
  const range: Range = selection.getRangeAt(0);
  if (!thread.contains(range.commonAncestorContainer)) return '';
  return selection.toString().trim();
}

// Always in the same place, the window's bottom-left corner; a newer copy replaces the note still showing.
function showToast(): void {
  document.querySelector('.copy-toast')?.remove();
  const toast: HTMLDivElement = element('div', 'copy-toast');
  toast.innerHTML = COPY_ICON;
  toast.append(element('span', '', TOAST_TEXT));
  document.body.append(toast);
  window.setTimeout((): void => toast.remove(), TOAST_MS);
}
