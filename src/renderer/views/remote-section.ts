import type { RemoteSettings } from '../../shared/remote-settings';
import { element } from '../dom';

const COPIED_FEEDBACK_MS: number = 1500;

// Settings' Orbit Web section. It is one persistent element, re-attached on every settings render, so what is typed
// in the External URL field survives the board's polling.
export class RemoteSection {
  readonly root: HTMLElement = element('section', 'settings-section remote-section');
  private settings: RemoteSettings | null = null;
  private busy: boolean = false;

  constructor() {
    this.root.append(element('h2', 'settings-heading', 'Orbit Web'), element('p', 'settings-note', 'Loading…'));
    void this.apply(window.radar.getRemoteSettings());
  }

  // True while a field in the section has focus, so the settings view is not rebuilt under the typing.
  get isEditing(): boolean {
    return this.root.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement;
  }

  private async apply(pending: Promise<RemoteSettings>): Promise<void> {
    this.busy = true;
    try {
      this.settings = await pending;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private render(): void {
    const settings: RemoteSettings | null = this.settings;
    if (settings === null) return;
    const group: HTMLDivElement = element('div', 'settings-group');
    group.append(this.renderToggle(settings));
    if (settings.enabled) group.append(this.renderLocalUrl(settings), this.renderExternalUrl(settings), this.renderToken(settings));
    this.root.replaceChildren(element('h2', 'settings-heading', 'Orbit Web'), group);
    if (settings.error !== null) this.root.append(element('p', 'settings-note remote-error', settings.error));
    if (settings.enabled) this.root.append(this.renderPairing(settings));
    this.root.append(element('p', 'settings-note', NOTE));
  }

  private renderToggle(settings: RemoteSettings): HTMLElement {
    const row: HTMLLabelElement = element('label', 'settings-row remote-row');
    const text: HTMLSpanElement = element('span', 'remote-label', 'Allow remote access');
    const state: string = settings.enabled ? (settings.running ? 'Listening' : 'Not listening') : 'Off';
    const toggle: HTMLInputElement = element('input', 'remote-switch');
    toggle.type = 'checkbox';
    toggle.checked = settings.enabled;
    toggle.disabled = this.busy;
    toggle.addEventListener('change', (): void => void this.apply(window.radar.setRemoteEnabled(toggle.checked)));
    row.append(text, element('span', 'remote-state', state), toggle);
    return row;
  }

  private renderLocalUrl(settings: RemoteSettings): HTMLElement {
    const row: HTMLDivElement = element('div', 'settings-row remote-row');
    row.append(element('span', 'remote-label', 'Local URL'), element('code', 'remote-value', settings.localUrl));
    return row;
  }

  private renderExternalUrl(settings: RemoteSettings): HTMLElement {
    const form: HTMLFormElement = element('form', 'settings-row remote-row');
    const input: HTMLInputElement = element('input', 'remote-input');
    input.type = 'url';
    input.placeholder = 'https://orbit.example.com';
    input.value = settings.externalUrl;
    input.spellcheck = false;
    const save: HTMLButtonElement = element('button', 'button', 'Save');
    save.type = 'submit';
    form.append(element('span', 'remote-label', 'External URL'), input, save);
    form.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault();
      input.blur();
      void this.apply(window.radar.setRemoteExternalUrl(input.value));
    });
    return form;
  }

  private renderToken(settings: RemoteSettings): HTMLElement {
    const row: HTMLDivElement = element('div', 'settings-row remote-row');
    const copy: HTMLButtonElement = element('button', 'button', 'Copy');
    copy.type = 'button';
    copy.addEventListener('click', (): void => void copyText(copy, settings.token));
    const regenerate: HTMLButtonElement = element('button', 'button', 'New token');
    regenerate.type = 'button';
    regenerate.title = 'Signs every paired phone out';
    regenerate.addEventListener('click', (): void => void this.apply(window.radar.regenerateRemoteToken()));
    row.append(element('span', 'remote-label', 'Access token'), element('code', 'remote-value remote-token', settings.token), copy, regenerate);
    return row;
  }

  // Without an external URL there is nothing a phone could open, so it says what is missing instead.
  private renderPairing(settings: RemoteSettings): HTMLElement {
    const pairing: HTMLDivElement = element('div', 'remote-pairing');
    if (settings.pairingQrSvg === null || settings.pairingUrl === null) {
      pairing.append(element('p', 'settings-note', 'Add the External URL your tunnel or proxy serves to get a pairing QR code.'));
      return pairing;
    }
    const code: HTMLDivElement = element('div', 'remote-qr');
    // Drawn by the main process from the pairing URL alone (pairing-qr.ts), never from text a page supplied.
    code.innerHTML = settings.pairingQrSvg;
    pairing.append(code, element('p', 'settings-note', 'Scan with the phone to sign in. Anyone with this code or the token can type into your chats.'));
    return pairing;
  }
}

const NOTE: string =
  'Serves the Board, Timeline, Panel and chats to a browser, on 127.0.0.1 only. Put it behind a tunnel or proxy with HTTPS to reach it from your phone; see "Orbit Web" in the README.';

async function copyText(button: HTMLButtonElement, text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  const label: string = button.textContent ?? '';
  button.textContent = 'Copied';
  window.setTimeout((): void => void (button.textContent = label), COPIED_FEEDBACK_MS);
}
