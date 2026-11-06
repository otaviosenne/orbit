import type { PairingOffer } from '../../shared/remote-settings';
import { copyText } from '../clipboard';
import { element } from '../dom';
import { showToast } from '../toast';

export const PAIRING_FAILED_NOTE: string = 'Could not make a code. Check that this page is still signed in, then try again.';

// A one-time code for another device: the QR code to scan, the code to type, and the link they both carry.
export function renderOffer(offer: PairingOffer): HTMLElement[] {
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
