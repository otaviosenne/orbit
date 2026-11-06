import type { RemoteDevice } from '../../shared/remote-settings';
import { element } from '../dom';
import { formatDuration } from '../format';

// Seen within this long reads as in use right now: a signed-in page asks the computer every few seconds.
const ACTIVE_MS: number = 2 * 60_000;
// Signing every device out takes a second click within this long, so one stray click cannot do it.
const ARM_MS: number = 4000;

export interface DeviceActions {
  readonly revoke: (id: string) => void;
  readonly signOutAll: () => void;
}

// Every browser signed in to Orbit Web, newest activity first, each with its own Sign out.
export function renderDeviceList(devices: readonly RemoteDevice[], now: number, actions: DeviceActions): HTMLElement[] {
  const heading: HTMLHeadingElement = element('h3', 'settings-subheading', 'Signed-in devices');
  if (devices.length === 0) return [heading, element('p', 'settings-note', 'No browser is signed in. Scan the QR code below to add one.')];
  const group: HTMLDivElement = element('div', 'settings-group remote-devices');
  group.append(...devices.map((device: RemoteDevice) => renderDevice(device, now, actions.revoke)));
  return [heading, group, renderSignOutAll(actions.signOutAll)];
}

function renderDevice(device: RemoteDevice, now: number, revoke: (id: string) => void): HTMLElement {
  const row: HTMLDivElement = element('div', 'settings-row remote-device');
  const text: HTMLDivElement = element('div', 'remote-device-text');
  text.append(element('span', 'remote-device-name', device.name), element('span', 'remote-device-detail', detailOf(device, now)));
  const signOut: HTMLButtonElement = element('button', 'button', 'Sign out');
  signOut.type = 'button';
  signOut.addEventListener('click', (): void => {
    signOut.disabled = true;
    revoke(device.id);
  });
  row.append(text, signOut);
  return row;
}

function detailOf(device: RemoteDevice, now: number): string {
  const seen: string = now - device.lastSeenAt < ACTIVE_MS ? 'Active now' : `Last seen ${formatDuration(now - device.lastSeenAt)} ago`;
  const since: string = new Date(device.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  return `${seen} · signed in ${since}`;
}

function renderSignOutAll(signOutAll: () => void): HTMLElement {
  const row: HTMLDivElement = element('div', 'remote-devices-actions');
  const button: HTMLButtonElement = element('button', 'button remote-sign-out-all', 'Sign out all devices');
  button.type = 'button';
  let armedUntil: number = 0;
  button.addEventListener('click', (): void => {
    if (Date.now() < armedUntil) {
      button.disabled = true;
      signOutAll();
      return;
    }
    armedUntil = Date.now() + ARM_MS;
    button.textContent = 'Click again to sign every device out';
    button.classList.add('is-armed');
    window.setTimeout((): void => {
      button.textContent = 'Sign out all devices';
      button.classList.remove('is-armed');
    }, ARM_MS);
  });
  row.append(button);
  return row;
}
