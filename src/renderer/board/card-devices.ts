import type { BrowserLink, ChatDevices, DeviceFocus, EmulatorLink } from '../../shared/types';
import { element } from '../dom';
import { isWebHost } from '../host';
import { ANDROID_ICON, BROWSER_ICON } from '../icons';
import { browserLines, emulatorLines } from '../sheet/device-links';
import { setTip } from '../tooltip';

export type CardDeviceKind = 'emulator' | 'browser';

export interface DeviceRecheck {
  recheck(sessionId: string, now: number): Promise<void>;
}

const CARD_DEVICE_ATTRIBUTE: string = 'cardDevice';
const CARD_DEVICE_SELECTOR: string = '[data-card-device]';
const BROWSER_LABEL: string = 'Open browser tab';
const BROWSER_COPY_LABEL: string = 'Copy the page address';
const EMULATOR_COPY_LABEL: string = 'Copy the Metro address';

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
  // Orbit Web copies the address instead of focusing a window on the computer (see device-copy.ts).
  const isWeb: boolean = isWebHost();
  const button: HTMLButtonElement = deviceButton('emulator', ANDROID_ICON, isWeb ? EMULATOR_COPY_LABEL : `Open emulator ${emulator.label}`);
  setTip(button, { title: isWeb ? EMULATOR_COPY_LABEL : 'Open emulator', lines: emulatorLines(emulator) });
  return button;
}

function browserButton(browser: BrowserLink): HTMLButtonElement {
  const label: string = isWebHost() ? BROWSER_COPY_LABEL : BROWSER_LABEL;
  const button: HTMLButtonElement = deviceButton('browser', BROWSER_ICON, label);
  setTip(button, { title: label, lines: browserLines(browser) });
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
