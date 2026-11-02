import { element } from './dom';
import { COPY_ICON, INFO_ICON } from './icons';

// Long enough to read a word; one with an address to check stays longer.
const BRIEF_MS: number = 1200;
const DETAILED_MS: number = 3200;
const TOAST_CLASS: string = 'copy-toast';

export interface ToastText {
  readonly title: string;
  // The copied address, shown so the user can see what is on the clipboard before pasting it.
  readonly preview?: string;
  readonly note?: string;
  // Nothing was copied; the title says why.
  readonly isProblem?: boolean;
}

// Always in the same place, the window's bottom-left corner; a newer note replaces the one still showing.
export function showCopyToast(text: ToastText): void {
  document.querySelector(`.${TOAST_CLASS}`)?.remove();
  const isDetailed: boolean = text.preview !== undefined || text.note !== undefined;
  const toast: HTMLDivElement = element('div', `${TOAST_CLASS}${isDetailed ? ' is-detailed' : ''}${text.isProblem === true ? ' is-problem' : ''}`);
  const head: HTMLDivElement = element('div', 'copy-toast-head');
  head.innerHTML = text.isProblem === true ? INFO_ICON : COPY_ICON;
  head.append(element('span', '', text.title));
  toast.append(head);
  if (text.preview !== undefined) toast.append(element('div', 'copy-toast-preview', text.preview));
  if (text.note !== undefined) toast.append(element('div', 'copy-toast-note', text.note));
  document.body.append(toast);
  window.setTimeout((): void => toast.remove(), isDetailed ? DETAILED_MS : BRIEF_MS);
}
