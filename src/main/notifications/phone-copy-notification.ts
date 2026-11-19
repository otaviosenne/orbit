import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { app } from 'electron';

const APP_NAME: string = 'Orbit';
// Only a confirmation that the Back Tap worked: gone before the user is back at the keyboard.
const EXPIRE_MS: number = 3000;
const COPIED_MESSAGE: string = 'Copied from iPhone';

// Says the phone's text is on the PC clipboard, never what the text is. Fire and forget: a missing notification
// daemon must not fail the copy.
export function showCopiedFromPhoneNotification(): void {
  const args: string[] = [
    '--app-name', APP_NAME, '--urgency', 'low', '--expire-time', String(EXPIRE_MS),
    '--icon', join(app.getAppPath(), 'assets', 'orbit-icon.svg'), APP_NAME, COPIED_MESSAGE,
  ];
  execFile('notify-send', args, (): void => undefined);
}
