// An emulator a chat drove, as named in its transcript. A port (from a serial like emulator-5556 or -port) is
// the precise key; an AVD name is used when no port was given; neither means "whatever emulator is connected".
export interface EmulatorReference {
  readonly port: number | null;
  readonly avd: string | null;
  // When the chat referred to it, so an emulator started afterwards by someone else is not taken for it.
  readonly at: number;
}

// The Claude in Chrome tab a chat used last, with the title and URL the extension last reported for it.
// tabId is a chrome.tabs id, which only the extension understands: from outside it is matched by URL and title.
export interface BrowserTabReference {
  readonly tabId: number;
  readonly title: string | null;
  readonly url: string | null;
  readonly at: number;
}

export interface DeviceReferences {
  // In transcript order, oldest first; emulators the chat closed again are left out.
  readonly emulators: readonly EmulatorReference[];
  readonly browserTab: BrowserTabReference | null;
}

export const NO_DEVICE_REFERENCES: DeviceReferences = { emulators: [], browserTab: null };
