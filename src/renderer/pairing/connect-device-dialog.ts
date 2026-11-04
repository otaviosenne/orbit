import type { PairingOffer } from '../../shared/remote-settings';
import { copyText } from '../clipboard';
import { element } from '../dom';
import { showToast } from '../toast';
import { requestPairingOffer } from './pairing-request';

const CLOSE_KEY: string = 'Escape';
const LOADING_NOTE: string = 'Making a code…';
const FAILED_NOTE: string = 'Could not make a code. Check that this page is still signed in, then try again.';

// Orbit Web on a signed-in device lets another one in: a QR code to scan, the link it holds, and a code to type at the
// sign-in screen. The code works once and expires, so the access token itself is never shown here.
export class ConnectDeviceDialog {
  private readonly overlay: HTMLDivElement = element('div', 'dialog-overlay');
  private readonly body: HTMLDivElement = element('div', 'pairing-body');

  constructor() {
    const dialog: HTMLDivElement = element('div', 'dialog pairing-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const close: HTMLButtonElement = element('button', 'dialog-button', 'Done');
    close.type = 'button';
    close.addEventListener('click', (): void => this.close());
    const actions: HTMLDivElement = element('div', 'dialog-actions');
    actions.append(close);
    dialog.append(element('h3', 'dialog-title', 'Connect another device'), this.body, actions);
    this.overlay.hidden = true;
    this.overlay.append(dialog);
    document.body.append(this.overlay);
    this.overlay.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (event.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY && !this.overlay.hidden) this.close();
    });
  }

  async open(): Promise<void> {
    this.body.replaceChildren(element('p', 'dialog-note', LOADING_NOTE));
    this.overlay.hidden = false;
    const offer: PairingOffer | null = await requestPairingOffer();
    this.body.replaceChildren(...(offer === null ? [element('p', 'dialog-note', FAILED_NOTE)] : renderOffer(offer)));
  }

  private close(): void {
    this.overlay.hidden = true;
    this.body.replaceChildren();
  }
}

function renderOffer(offer: PairingOffer): HTMLElement[] {
  const until: string = new Date(offer.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const qr: HTMLDivElement = element('div', 'remote-qr pairing-qr');
  // Drawn by the computer from the link alone (pairing-offer.ts), never from text a page supplied.
  qr.innerHTML = offer.qrSvg;
  const copy: HTMLButtonElement = element('button', 'button pairing-copy', 'Copy link');
  copy.type = 'button';
  copy.addEventListener('click', (): void => {
    void copyText(offer.link).then((copied: boolean): void => showToast(copied ? { title: 'Copied the sign-in link', preview: offer.link } : { title: 'The browser did not allow copying', preview: offer.link, isProblem: true }));
  });
  return [
    element('p', 'dialog-note', `Scan the code or open the link on the other device, or type this code where it asks for the access token. It works once, until ${until}.`),
    qr,
    element('p', 'pairing-code', offer.code),
    copy,
  ];
}
