import { REMOTE_CLIPBOARD_PATH } from '../../shared/remote-settings';
import { copyText } from '../clipboard';
import { element } from '../dom';
import { showToast } from '../toast';

export const SHORTCUTS_TOKEN_FAILED_NOTE: string = 'Could not make a token. Check that this page is still signed in, then try again.';

// The address and token the two Back Tap Shortcuts need. Copying is its own press: a phone refuses a copy that
// comes after the wait for the computer's answer.
export function renderShortcutsToken(token: string): HTMLElement[] {
  const address: string = `${window.location.origin}${REMOTE_CLIPBOARD_PATH}`;
  return [
    element('p', 'dialog-note', 'In both Shortcuts, Get Contents of URL with this address and the header Authorization: Bearer followed by the token. GET brings the PC clipboard here; POST with JSON {"text": Clipboard} sends this one there. Making another token stops this one.'),
    copyRow('Address', address, 'Copied the clipboard address'),
    copyRow('Token', token, 'Copied the Shortcuts token'),
  ];
}

function copyRow(label: string, value: string, copiedTitle: string): HTMLElement {
  const row: HTMLDivElement = element('div', 'settings-row remote-row');
  const copy: HTMLButtonElement = element('button', 'button', 'Copy');
  copy.type = 'button';
  // The toast never repeats the token: it is on screen already, and a toast can outlive the page.
  copy.addEventListener('click', (): void => {
    void copyText(value).then((copied: boolean): void => showToast(copied ? { title: copiedTitle } : { title: 'The browser did not allow copying', isProblem: true }));
  });
  row.append(element('span', 'remote-label', label), element('code', 'remote-value remote-token', value), copy);
  return row;
}
