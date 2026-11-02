import { showToast } from '../toast';
import { isTouchWeb } from '../host';

const TOAST_TEXT: string = 'Copied';

// Selecting text in the thread copies it, like a terminal: no Ctrl+C needed. A phone keeps its own selection menu.
export function installCopyOnSelect(thread: HTMLElement): void {
  if (isTouchWeb()) return;
  thread.addEventListener('mouseup', (): void => {
    const text: string = selectedTextIn(thread);
    if (text.length === 0) return;
    void navigator.clipboard.writeText(text).then((): void => showToast({ title: TOAST_TEXT }), (): void => undefined);
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
