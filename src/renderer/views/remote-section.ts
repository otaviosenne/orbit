import type { RemoteSettings } from '../../shared/remote-settings';
import { element } from '../dom';

const COPIED_FEEDBACK_MS: number = 1500;

// Settings' Orbit Web section. It is one persistent element, re-attached on every settings render, so what is typed
// in the External URL field survives the board's polling.
export class RemoteSection {
  readonly root: HTMLElement = element('section', 'settings-section remote-section');
  private settings: RemoteSettings | null = null;
  private busy: boolean = false;
  // Kept across renders, so How it works stays open while the switch or a field is used.
  private readonly intro: HTMLElement = renderIntro();

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
    // Shown at once, so the switch is disabled while the server starts or stops.
    this.render();
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
    this.root.replaceChildren(element('h2', 'settings-heading', 'Orbit Web'), this.intro);
    group.append(this.renderToggle(settings));
    if (settings.enabled) group.append(this.renderLocalUrl(settings), this.renderExternalUrl(settings), this.renderToken(settings));
    this.root.append(group);
    if (settings.error !== null) this.root.append(element('p', 'settings-note remote-error', settings.error));
    if (settings.enabled) this.root.append(this.renderPairing(settings));
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

  // Only the port can change: the server always stays on this computer's loopback address.
  private renderLocalUrl(settings: RemoteSettings): HTMLElement {
    const form: HTMLFormElement = element('form', 'settings-row remote-row');
    const input: HTMLInputElement = element('input', 'remote-input remote-port');
    input.inputMode = 'numeric';
    input.value = String(settings.port);
    input.spellcheck = false;
    input.title = 'Port, 1024 to 65535; the tunnel or proxy must point to the same one';
    const save: HTMLButtonElement = element('button', 'button', 'Save');
    save.type = 'submit';
    const host: string = settings.localUrl.slice(0, settings.localUrl.lastIndexOf(':') + 1);
    form.append(element('span', 'remote-label', 'Local URL'), element('code', 'remote-value remote-host', host), input, save);
    form.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault();
      input.blur();
      void this.apply(window.radar.setRemotePort(input.value));
    });
    return form;
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
      pairing.append(element('p', 'settings-note', 'Add an External URL to get the QR code.'));
      return pairing;
    }
    const code: HTMLDivElement = element('div', 'remote-qr');
    // Drawn by the main process from the pairing URL alone (pairing-qr.ts), never from text a page supplied.
    code.innerHTML = settings.pairingQrSvg;
    pairing.append(code, element('p', 'settings-note', 'Scan with your phone to sign in. Anyone with this code or the token can type into your chats; New token signs every phone out.'));
    return pairing;
  }
}

const INTRO: string = 'Use Orbit from a browser, such as on your phone.';
const STEPS: readonly string[] = [
  'Turn on Allow remote access: Orbit serves itself at the Local URL, on this computer only.',
  'Point a tunnel or proxy with HTTPS at the Local URL and type its address in External URL.',
  'Scan the QR code with your phone to open it already signed in.',
];
const STEPS_SUMMARY: string = 'How it works';

// One line up front; the three steps fold away so the page is not a wall of text.
function renderIntro(): HTMLElement {
  const intro: HTMLDivElement = element('div', 'remote-intro');
  const how: HTMLDetailsElement = element('details', 'remote-how');
  const steps: HTMLOListElement = element('ol', 'remote-steps');
  steps.append(...STEPS.map((step: string): HTMLLIElement => element('li', '', step)));
  how.append(element('summary', 'remote-how-summary', STEPS_SUMMARY), steps);
  intro.append(element('p', 'settings-lead', INTRO), how);
  return intro;
}

async function copyText(button: HTMLButtonElement, text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  const label: string = button.textContent ?? '';
  button.textContent = 'Copied';
  window.setTimeout((): void => void (button.textContent = label), COPIED_FEEDBACK_MS);
}
