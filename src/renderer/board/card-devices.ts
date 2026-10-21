import type { BrowserLink, ChatDevices, DeviceFocus, EmulatorLink } from '../../shared/types';
import { element } from '../dom';
import { ANDROID_ICON, BROWSER_ICON } from '../icons';
import { browserLines } from '../sheet/device-links';
import { setTip } from '../tooltip';

export type CardDeviceKind = 'emulator' | 'browser';

export interface DeviceRecheck {
  recheck(sessionId: string, now: number): Promise<void>;
}

const CARD_DEVICE_ATTRIBUTE: string = 'cardDevice';
const CARD_DEVICE_SELECTOR: string = '[data-card-device]';
const BROWSER_LABEL: string = 'Open browser tab';

// The same focus the chat panel's Emulator and Browser pills ask for.
const FOCUS_REQUESTS: Readonly<Record<CardDeviceKind, (sessionId: string) => Promise<DeviceFocus>>> = {
  emulator: (sessionId: string): Promise<DeviceFocus> => window.radar.focusChatEmulator(sessionId),
  browser: (sessionId: string): Promise<DeviceFocus> => window.radar.focusChatBrowser(sessionId),
};

// Icon-only buttons beside a card's name, one per device the chat has open; none when it has neither.
export function renderCardDevices(devices: ChatDevices): HTMLButtonElement[] {
  const buttons: HTMLButtonElement[] = [];
  if (devices.emulator !== null) buttons.push(emulatorButton(devices.emulator));
  if (devices.browser !== null) buttons.push(browserButton(devices.browser));
  return buttons;
}

// The board acts on press, like the card itself, so the press is read here before it could open the card.
export function cardDeviceAt(target: EventTarget | null): CardDeviceKind | null {
  const kind: string | undefined = (target as HTMLElement).closest<HTMLElement>(CARD_DEVICE_SELECTOR)?.dataset[CARD_DEVICE_ATTRIBUTE];
  return isCardDeviceKind(kind) ? kind : null;
}

export function focusCardDevice(kind: CardDeviceKind, sessionId: string): Promise<DeviceFocus> {
  return FOCUS_REQUESTS[kind](sessionId).catch((): DeviceFocus => 'missing');
}

// Goes to the device; one that has closed since its icon was drawn is asked about again, so the icon goes away.
export async function openCardDevice(kind: CardDeviceKind, sessionId: string, devices: DeviceRecheck): Promise<void> {
  if ((await focusCardDevice(kind, sessionId)) !== 'missing') return;
  console.warn(`The ${kind} of chat ${sessionId} is no longer open`);
  await devices.recheck(sessionId, Date.now());
}

function emulatorButton(emulator: EmulatorLink): HTMLButtonElement {
  const button: HTMLButtonElement = deviceButton('emulator', ANDROID_ICON, `Open emulator ${emulator.label}`);
  setTip(button, { title: 'Open emulator', lines: [emulator.label] });
  return button;
}

function browserButton(browser: BrowserLink): HTMLButtonElement {
  const button: HTMLButtonElement = deviceButton('browser', BROWSER_ICON, BROWSER_LABEL);
  setTip(button, { title: BROWSER_LABEL, lines: browserLines(browser) });
  return button;
}

function deviceButton(kind: CardDeviceKind, icon: string, label: string): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', `card-device is-${kind}`);
  button.type = 'button';
  button.dataset[CARD_DEVICE_ATTRIBUTE] = kind;
  button.setAttribute('aria-label', label);
  button.innerHTML = icon;
  return button;
}

function isCardDeviceKind(value: string | undefined): value is CardDeviceKind {
  return value === 'emulator' || value === 'browser';
}
