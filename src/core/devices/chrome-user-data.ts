import { join } from 'node:path';

const USER_DATA_FLAG: RegExp = /^--user-data-dir=(.+)$/;
// Chromium names its profile folder "chromium" whatever its package calls the binary or window class.
const CHROMIUM_CLASS: RegExp = /^chromium/i;
const CHROMIUM_FOLDER: string = 'chromium';

// Where a Chrome keeps its profiles: the flag it was started with, else its build's folder under ~/.config,
// which Linux Chrome names like its window class (google-chrome, google-chrome-beta, google-chrome-unstable).
export function chromeUserDataDir(args: readonly string[], className: string, configHome: string): string {
  const flagged: string | undefined = args.map((arg: string) => USER_DATA_FLAG.exec(arg)?.[1]).find((dir) => dir !== undefined);
  if (flagged !== undefined) return flagged;
  return join(configHome, CHROMIUM_CLASS.test(className) ? CHROMIUM_FOLDER : className.toLowerCase());
}
