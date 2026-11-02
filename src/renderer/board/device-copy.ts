import { copyText } from '../clipboard';
import { showToast } from '../toast';
import type { ToastText } from '../toast';
import type { BrowserLink, ChatDevices, EmulatorLink } from '../../shared/types';
import type { CardDeviceKind } from './card-devices';

// What a device button copies on Orbit Web, and how the note under it reads.
export interface DeviceCopy {
  readonly text: string | null;
  readonly toast: ToastText;
}

const NOT_OPEN: DeviceCopy = { text: null, toast: { title: 'This device is no longer open', isProblem: true } };

// On a phone the device buttons cannot bring a window up on the computer, so they copy the address the phone can open:
// the tunnel address of the Metro the emulator loads from, or of the page the Chrome tab shows.
export function copyDeviceAddress(kind: CardDeviceKind, devices: ChatDevices): void {
  const copy: DeviceCopy = deviceCopy(kind, devices);
  if (copy.text === null) return showToast(copy.toast);
  // Started inside the press: a phone refuses a copy that comes later.
  void copyText(copy.text).then((copied: boolean): void =>
    showToast(copied ? copy.toast : { title: 'The browser did not allow copying', preview: copy.text ?? undefined, isProblem: true }),
  );
}

export function deviceCopy(kind: CardDeviceKind, devices: ChatDevices): DeviceCopy {
  if (kind === 'emulator') return devices.emulator === null ? NOT_OPEN : emulatorCopy(devices.emulator);
  return devices.browser === null ? NOT_OPEN : browserCopy(devices.browser);
}

function emulatorCopy(emulator: EmulatorLink): DeviceCopy {
  if (emulator.publicUrl !== null) return { text: emulator.publicUrl, toast: { title: 'Copied the Metro address', preview: emulator.publicUrl } };
  if (emulator.metroPort === null) return { text: null, toast: { title: "No Metro server found for this chat's emulator", isProblem: true } };
  return { text: null, toast: { title: `Metro is on port ${emulator.metroPort}, which the tunnel does not publish`, isProblem: true } };
}

// A local page on a port the tunnel does not publish is still copied: it opens on the computer, and the note says so.
function browserCopy(browser: BrowserLink): DeviceCopy {
  if (browser.publicUrl !== null) return { text: browser.publicUrl, toast: { title: 'Copied the page address', preview: browser.publicUrl } };
  if (browser.url === null) return { text: null, toast: { title: "This tab's address is not known yet", isProblem: true } };
  return { text: browser.url, toast: { title: 'Copied the page address', preview: browser.url, note: 'Only opens on the computer: the tunnel does not publish this port' } };
}
