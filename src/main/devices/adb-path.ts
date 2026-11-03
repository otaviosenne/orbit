import { homedir } from 'node:os';
import { join } from 'node:path';

// Where the SDK puts adb when it is not on Orbit's PATH, which comes from the compositor and not from a shell profile.
export function adbPath(): string {
  const sdk: string = process.env['ANDROID_HOME'] ?? process.env['ANDROID_SDK_ROOT'] ?? join(homedir(), 'Android', 'Sdk');
  return join(sdk, 'platform-tools', 'adb');
}
