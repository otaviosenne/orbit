import type { ActionResult, UsageSnapshot } from '../../shared/types';
import { element } from '../dom';

const SIGNED_OUT_LABEL: string = 'Signed out';
const SIGN_IN_TITLE: string = 'Claude Code has no login. Click to open the sign-in in a terminal.';

export function isSignedOut(usage: UsageSnapshot | null): boolean {
  return usage?.login === 'signed-out';
}

// Opens a terminal for the user to sign in; Orbit never sees the password or the token. Orbit Web cannot open one.
export function openSignIn(report: (problem: string) => void): void {
  void window.radar.openSignIn().then((result: ActionResult): void => {
    if (!result.ok) report(result.error ?? 'Could not open the sign-in');
  });
}

// The top bar's red "Signed out" button, shown only while there is no login.
export class SignInBadge {
  readonly root: HTMLButtonElement = element('button', 'sign-in-badge', SIGNED_OUT_LABEL);

  constructor(onClick: () => void) {
    this.root.type = 'button';
    this.root.hidden = true;
    this.root.title = SIGN_IN_TITLE;
    this.root.addEventListener('click', onClick);
  }

  show(usage: UsageSnapshot | null): void {
    this.root.hidden = !isSignedOut(usage);
  }
}

// The Usage page's own row: says what is wrong and offers the button.
export function renderSignInRow(onClick: () => void): HTMLElement {
  const row: HTMLDivElement = element('div', 'settings-row sign-in-row');
  const text: HTMLDivElement = element('div', 'limit-text');
  text.append(element('span', 'limit-label', SIGNED_OUT_LABEL), element('span', 'limit-reset', 'Usage, dictation and chats need a Claude login.'));
  const button: HTMLButtonElement = element('button', 'button button-primary', 'Sign in');
  button.type = 'button';
  button.addEventListener('click', onClick);
  row.append(text, button);
  return row;
}
