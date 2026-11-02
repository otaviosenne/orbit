import { element } from './dom';
import { COPY_ICON, INFO_ICON } from './icons';

// A short note in the window's corner: what was copied, or how an action across chats went.
// Long enough to read a word; one with a detail line stays longer.
const BRIEF_MS: number = 1200;
const DETAILED_MS: number = 3200;
const TOAST_CLASS: string = 'toast';

export interface ToastText {
  readonly title: string;
  // A copied address, shown in monospace so the user can see what is on the clipboard before pasting it.
  readonly preview?: string;
  readonly note?: string;
  // Nothing happened; the title says why.
  readonly isProblem?: boolean;
  // The copy icon when left out.
  readonly icon?: string;
}

// Always in the same place, the window's bottom-left corner; a newer note replaces the one still showing.
export function showToast(text: ToastText): void {
  document.querySelector(`.${TOAST_CLASS}`)?.remove();
  const isDetailed: boolean = text.preview !== undefined || text.note !== undefined;
  const toast: HTMLDivElement = element('div', `${TOAST_CLASS}${isDetailed ? ' is-detailed' : ''}${text.isProblem === true ? ' is-problem' : ''}`);
  const head: HTMLDivElement = element('div', 'toast-head');
  head.innerHTML = text.isProblem === true ? INFO_ICON : (text.icon ?? COPY_ICON);
  head.append(element('span', '', text.title));
  toast.append(head);
  if (text.preview !== undefined) toast.append(element('div', 'toast-preview', text.preview));
  if (text.note !== undefined) toast.append(element('div', 'toast-note', text.note));
  document.body.append(toast);
  window.setTimeout((): void => toast.remove(), isDetailed ? DETAILED_MS : BRIEF_MS);
}
