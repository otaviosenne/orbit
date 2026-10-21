// What one shell command says about emulators: the ones it targets and the ones it shuts down.
export interface EmulatorTargets {
  readonly ports: readonly number[];
  readonly avds: readonly AvdLaunch[];
  readonly closedPorts: readonly number[];
  // Targets "the" connected device without naming one (expo run:android, adb shell without -s).
  readonly untargeted: boolean;
}

export interface AvdLaunch {
  readonly avd: string;
  readonly port: number | null;
}

// Commands chain with ; && || | and newlines; flags only bind to the command they sit in.
const SEGMENT_SEPARATOR: RegExp = /[;\n|&]+/;
// adb names an emulator by its console port: emulator-5554.
const SERIAL: RegExp = /\bemulator-(\d{4,5})\b/g;
// `emulator -avd NAME` or `emulator @NAME`; "emulator/" in the SDK path is not followed by a space, so it never matches.
const AVD_LAUNCH: RegExp = /\bemulator\s(?:[^\n]*?\s)?(?:-avd\s+|@)([\w.-]+)/;
const PORT_FLAG: RegExp = /\s-port\s+(\d{4,5})\b/;
const KILL: RegExp = /\bemu\s+kill\b/;
const RUNS_ON_DEVICE: RegExp = /\bexpo\s+run:android\b|\breact-native\s+run-android\b|\bexpo\s+start\b[^\n]*?(?:--android|\s-a\b)/;
// adb subcommands that act on a device; listing or restarting the adb server does not.
const ADB_ON_DEVICE: RegExp = /\badb\s+(?:shell|install|reverse|exec-out|emu|logcat|push|pull|wait-for-device)\b/;

export function emulatorTargets(command: string): EmulatorTargets {
  const ports: number[] = [];
  const avds: AvdLaunch[] = [];
  const closedPorts: number[] = [];
  for (const segment of command.split(SEGMENT_SEPARATOR)) {
    const launch: AvdLaunch | null = avdLaunch(segment);
    if (launch !== null) avds.push(launch);
    const serials: number[] = serialPorts(segment);
    ports.push(...serials);
    if (KILL.test(segment)) closedPorts.push(...serials);
  }
  const named: boolean = ports.length > 0 || avds.length > 0 || command.includes('ANDROID_SERIAL');
  return { ports, avds, closedPorts, untargeted: !named && isUntargetedDeviceCommand(command) };
}

function avdLaunch(segment: string): AvdLaunch | null {
  const avd: string | undefined = AVD_LAUNCH.exec(segment)?.[1];
  if (avd === undefined) return null;
  const port: string | undefined = PORT_FLAG.exec(segment)?.[1];
  return { avd, port: port === undefined ? null : Number(port) };
}

function serialPorts(segment: string): number[] {
  return [...segment.matchAll(SERIAL)].map((match: RegExpMatchArray) => Number(match[1]));
}

function isUntargetedDeviceCommand(command: string): boolean {
  return RUNS_ON_DEVICE.test(command) || (ADB_ON_DEVICE.test(command) && !/\badb\s+-s\b/.test(command));
}
