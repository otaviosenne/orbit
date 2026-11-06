import type { PairingOffer } from '../../shared/remote-settings';
import { element } from '../dom';
import { PAIRING_FAILED_NOTE, renderOffer } from './pairing-offer-view';
import { requestPairingOffer } from './pairing-request';

const CLOSE_KEY: string = 'Escape';
const LOADING_NOTE: string = 'Making a code…';

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
    this.body.replaceChildren(...(offer === null ? [element('p', 'dialog-note', PAIRING_FAILED_NOTE)] : renderOffer(offer)));
  }

  private close(): void {
    this.overlay.hidden = true;
    this.body.replaceChildren();
  }
}
