import { element } from '../dom';
import { isTouchWeb } from '../host';

// Long enough to read, short enough not to sit over the text being read.
const TOAST_MS: number = 900;
// Offset from the pointer, so the label never covers the selection's end.
const TOAST_OFFSET_PX: number = 12;
const TOAST_TEXT: string = 'Copied';

// Selecting text in the thread copies it, like a terminal: no Ctrl+C needed. A phone keeps its own selection menu.
export function installCopyOnSelect(thread: HTMLElement): void {
  if (isTouchWeb()) return;
  thread.addEventListener('mouseup', (event: MouseEvent): void => {
    const text: string = selectedTextIn(thread);
    if (text.length === 0) return;
    void navigator.clipboard.writeText(text).then((): void => showToast(event.clientX, event.clientY), (): void => undefined);
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

function showToast(x: number, y: number): void {
  const toast: HTMLDivElement = element('div', 'copy-toast', TOAST_TEXT);
  toast.style.left = `${x + TOAST_OFFSET_PX}px`;
  toast.style.top = `${y + TOAST_OFFSET_PX}px`;
  document.body.append(toast);
  window.setTimeout((): void => toast.remove(), TOAST_MS);
}
