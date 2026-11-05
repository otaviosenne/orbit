import type { LocalCiRun } from '../../shared/local-ci';
import type { BrowserLink, ChatDevices, DeviceFocus, EmulatorLink, ServerLink } from '../../shared/types';
import { element } from '../dom';
import { isWebHost } from '../host';
import { ANDROID_ICON, BROWSER_ICON, LOCAL_CI_ICON, SERVERS_ICON } from '../icons';
import { serverLines } from '../servers/server-address';
import { browserLines, emulatorLines } from '../sheet/device-links';
import { setTip } from '../tooltip';

export type CardDeviceKind = 'emulator' | 'browser';
export type CardIconKind = CardDeviceKind | 'servers' | 'local-ci';

export interface DeviceRecheck {
  recheck(sessionId: string, now: number): Promise<void>;
}

const CARD_DEVICE_ATTRIBUTE: string = 'cardDevice';
const CARD_DEVICE_SELECTOR: string = '[data-card-device]';
const CARD_SERVERS_ATTRIBUTE: string = 'cardServers';
const CARD_SERVERS_SELECTOR: string = '[data-card-servers]';
const SERVERS_LABEL: string = "Copy the address of one of this chat's servers";
const BROWSER_LABEL: string = 'Open browser tab';
const BROWSER_COPY_LABEL: string = 'Copy the page address';
const EMULATOR_COPY_LABEL: string = 'Copy the Metro address';
const LOCAL_CI_LABEL: string = 'Local CI running';

// The same focus the chat panel's Emulator and Browser pills ask for.
const FOCUS_REQUESTS: Readonly<Record<CardDeviceKind, (sessionId: string) => Promise<DeviceFocus>>> = {
  emulator: (sessionId: string): Promise<DeviceFocus> => window.radar.focusChatEmulator(sessionId),
  browser: (sessionId: string): Promise<DeviceFocus> => window.radar.focusChatBrowser(sessionId),
};

// Icon-only buttons beside a card's name, one per device the chat has open; none when it has neither.
export function renderCardDevices(devices: ChatDevices, localCi: LocalCiRun | null): HTMLElement[] {
  return cardIconKinds(devices, localCi).map((kind: CardIconKind): HTMLElement => renderIcon(kind, devices, localCi));
}

// While the local CI runs, what listens is the database it started for its tests, so its badge takes the servers'
// place: the chat is busy checking, not serving anything worth copying.
export function cardIconKinds(devices: ChatDevices, localCi: LocalCiRun | null): CardIconKind[] {
  const kinds: CardIconKind[] = [];
  if (devices.emulator !== null) kinds.push('emulator');
  if (devices.browser !== null) kinds.push('browser');
  if (localCi !== null) kinds.push('local-ci');
  else if (devices.servers.length > 0) kinds.push('servers');
  return kinds;
}

function renderIcon(kind: CardIconKind, devices: ChatDevices, localCi: LocalCiRun | null): HTMLElement {
  if (kind === 'emulator' && devices.emulator !== null) return emulatorButton(devices.emulator);
  if (kind === 'browser' && devices.browser !== null) return browserButton(devices.browser);
  if (kind === 'local-ci' && localCi !== null) return localCiBadge(localCi);
  return serversButton(devices.servers);
}

// Not a button: a press opens the card, whose panel shows the run's green bar with its time.
function localCiBadge(run: LocalCiRun): HTMLElement {
  const badge: HTMLSpanElement = element('span', 'card-device is-local-ci');
  badge.setAttribute('aria-label', LOCAL_CI_LABEL);
  badge.innerHTML = LOCAL_CI_ICON;
  setTip(badge, { title: LOCAL_CI_LABEL, lines: run.options.length > 0 ? [run.options.join(' ')] : [] });
  return badge;
}

// The servers icon under a press, which opens the list of the chat's ports instead of opening the card.
export function cardServersAt(target: EventTarget | null): HTMLElement | null {
  return (target as HTMLElement).closest<HTMLElement>(CARD_SERVERS_SELECTOR);
}

function serversButton(servers: readonly ServerLink[]): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'card-device is-servers');
  button.type = 'button';
  button.dataset[CARD_SERVERS_ATTRIBUTE] = '';
  button.setAttribute('aria-label', SERVERS_LABEL);
  button.innerHTML = SERVERS_ICON;
  setTip(button, { title: servers.length === 1 ? 'Server' : `${servers.length} servers`, lines: serverLines(servers) });
  return button;
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
