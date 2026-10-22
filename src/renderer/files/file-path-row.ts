import { element } from '../dom';
import { isWebHost } from '../host';
import { COPY_ICON } from '../icons';
import { FOLDER_ICON } from './file-icons';
import type { FileView } from './file-view';

const COPIED_LABEL: string = 'Copied';
const COPY_LABEL: string = 'Copy path';
const REVEAL_LABEL: string = 'Show in folder';
const SENDING_NOTE: string = 'Its path shows here once the chat has the message.';
const COPIED_SHOW_MS: number = 1500;

// The path Claude got, to copy; on the desktop also a way to the file in the file manager (never opened or run).
export function renderPathRow(view: FileView): HTMLElement {
  const row: HTMLDivElement = element('div', 'file-viewer-path-row');
  if (view.path === null) {
    row.append(element('p', 'file-viewer-note', SENDING_NOTE));
    return row;
  }
  const path: HTMLElement = element('code', 'file-viewer-path', view.path);
  const actions: HTMLDivElement = element('div', 'file-viewer-actions');
  actions.append(copyButton(view.path), ...(isWebHost() ? [] : [revealButton(view.path)]));
  row.append(path, actions);
  return row;
}

function copyButton(path: string): HTMLButtonElement {
  const button: HTMLButtonElement = actionButton(COPY_ICON, COPY_LABEL);
  button.addEventListener('click', (): void => {
    void navigator.clipboard.writeText(path).then((): void => showCopied(button), (): void => undefined);
  });
  return button;
}

function revealButton(path: string): HTMLButtonElement {
  const button: HTMLButtonElement = actionButton(FOLDER_ICON, REVEAL_LABEL);
  button.addEventListener('click', (): void => void window.radar.revealFile(path));
  return button;
}

function actionButton(icon: string, label: string): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'button file-viewer-action');
  button.type = 'button';
  button.innerHTML = icon;
  button.append(element('span', 'file-viewer-action-label', label));
  return button;
}

function showCopied(button: HTMLButtonElement): void {
  const label: HTMLElement | null = button.querySelector('.file-viewer-action-label');
  if (label === null) return;
  label.textContent = COPIED_LABEL;
  window.setTimeout((): void => {
    label.textContent = COPY_LABEL;
  }, COPIED_SHOW_MS);
}
