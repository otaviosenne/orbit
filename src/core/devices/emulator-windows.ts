import type { EmulatorReference } from './device-references';
import type { DesktopWindow } from './desktop-window';

export interface EmulatorWindow {
  readonly window: DesktopWindow;
  readonly avd: string;
  readonly port: number;
}

const EMULATOR_CLASS: string = 'Emulator';
// The emulator titles its window "Android Emulator - <avd>:<console port>".
const EMULATOR_TITLE: RegExp = /^Android Emulator - (.+):(\d{4,5})$/;
const SECOND_MS: number = 1000;
// A launch command is logged a moment before the emulator process exists; a reference this much older than the
// process still counts as the one that started it.
const LAUNCH_GRACE_MS: number = 120 * SECOND_MS;

export function emulatorWindows(windows: readonly DesktopWindow[]): EmulatorWindow[] {
  return windows.flatMap((window: DesktopWindow): EmulatorWindow[] => {
    const match: RegExpExecArray | null = window.className === EMULATOR_CLASS ? EMULATOR_TITLE.exec(window.title) : null;
    return match === null ? [] : [{ window, avd: match[1] ?? '', port: Number(match[2]) }];
  });
}

// The live emulator the chat referred to most recently. A reference from before that emulator started points at
// an earlier one that has since gone, so it is skipped; an unnamed reference counts only when one emulator is up.
export function pickEmulatorWindow(references: readonly EmulatorReference[], windows: readonly DesktopWindow[]): EmulatorWindow | null {
  const live: EmulatorWindow[] = emulatorWindows(windows);
  for (let index: number = references.length - 1; index >= 0; index--) {
    const reference: EmulatorReference | undefined = references[index];
    if (reference === undefined) continue;
    const found: EmulatorWindow | undefined = candidates(reference, live).find((emulator: EmulatorWindow) => startedBefore(reference, emulator));
    if (found !== undefined) return found;
  }
  return null;
}

function candidates(reference: EmulatorReference, live: readonly EmulatorWindow[]): readonly EmulatorWindow[] {
  if (reference.port !== null) return live.filter((emulator: EmulatorWindow) => emulator.port === reference.port);
  if (reference.avd !== null) return live.filter((emulator: EmulatorWindow) => emulator.avd === reference.avd);
  return live.length === 1 ? live : [];
}

function startedBefore(reference: EmulatorReference, emulator: EmulatorWindow): boolean {
  const startedAt: number | null = emulator.window.startedAt;
  return startedAt === null || reference.at >= startedAt - LAUNCH_GRACE_MS;
}

export function emulatorLabel(emulator: EmulatorWindow): string {
  return `${emulator.avd}:${emulator.port}`;
}
