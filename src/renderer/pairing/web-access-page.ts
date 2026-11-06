import type { PairingOffer, RemoteDevice } from '../../shared/remote-settings';
import { element } from '../dom';
import { fetchThisDevice, signOutThisDevice } from './device-session';
import { PAIRING_FAILED_NOTE, renderOffer } from './pairing-offer-view';
import { requestPairingOffer } from './pairing-request';

// Signing out takes a second press within this long, so one stray tap does not end the session.
const ARM_MS: number = 4000;
const SIGN_OUT_LABEL: string = 'Sign out of this device';
const SIGN_OUT_FAILED: string = 'The computer did not sign this device out. Restart Orbit on the computer, or sign it out from the desktop’s device list.';

// Settings › Orbit Web in a browser: let another device in, and leave on this one. The token, the switch and the
// device list stay on the desktop. One persistent element, so a code on screen survives the page's rebuild on every
// poll, and a code is made only when asked for.
export class WebAccessPage {
  readonly root: HTMLElement = element('section', 'settings-section web-access');
  private readonly thisDevice: HTMLParagraphElement = element('p', 'settings-lead', 'This browser is signed in to Orbit.');
  private readonly offer: HTMLDivElement = element('div', 'web-access-offer');

  constructor() {
    this.root.append(element('h2', 'settings-heading', 'Orbit Web'), this.thisDevice, this.renderConnect(), this.offer, this.renderSignOut());
    void fetchThisDevice().then((device: RemoteDevice | null): void => {
      if (device !== null) this.thisDevice.textContent = `This device: ${device.name}, signed in ${new Date(device.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}.`;
    });
  }

  private renderConnect(): HTMLElement {
    const group: HTMLDivElement = element('div', 'settings-group');
    const row: HTMLDivElement = element('div', 'settings-row remote-row');
    const text: HTMLDivElement = element('div', 'remote-device-text');
    text.append(
      element('span', 'remote-device-name', 'Connect another device'),
      element('span', 'remote-device-detail', 'A QR code and a one-time code to sign another phone or computer in, without the access token.'),
    );
    const make: HTMLButtonElement = element('button', 'button button-primary', 'New code');
    make.type = 'button';
    make.addEventListener('click', (): void => void this.showOffer(make));
    row.append(text, make);
    group.append(row);
    return group;
  }

  private async showOffer(button: HTMLButtonElement): Promise<void> {
    button.disabled = true;
    this.offer.replaceChildren(element('p', 'settings-note', 'Making a code…'));
    const offer: PairingOffer | null = await requestPairingOffer();
    this.offer.replaceChildren(...(offer === null ? [element('p', 'settings-note remote-error', PAIRING_FAILED_NOTE)] : renderOffer(offer)));
    button.disabled = false;
  }

  private renderSignOut(): HTMLElement {
    const box: HTMLDivElement = element('div', 'remote-devices-actions');
    const button: HTMLButtonElement = element('button', 'button remote-sign-out-all', SIGN_OUT_LABEL);
    const note: HTMLParagraphElement = element('p', 'settings-note remote-error');
    note.hidden = true;
    button.type = 'button';
    let armedUntil: number = 0;
    button.addEventListener('click', (): void => {
      if (Date.now() >= armedUntil) {
        armedUntil = Date.now() + ARM_MS;
        button.textContent = 'Tap again to sign out';
        button.classList.add('is-armed');
        window.setTimeout((): void => {
          button.textContent = SIGN_OUT_LABEL;
          button.classList.remove('is-armed');
        }, ARM_MS);
        return;
      }
      button.disabled = true;
      void signOutThisDevice().then((done: boolean): void => {
        if (done) return window.location.reload();
        button.disabled = false;
        note.textContent = SIGN_OUT_FAILED;
        note.hidden = false;
      });
    });
    box.append(button);
    const wrap: HTMLDivElement = element('div', 'web-access-sign-out');
    wrap.append(box, note);
    return wrap;
  }
}
