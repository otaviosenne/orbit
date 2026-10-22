import { execFile, spawn } from 'node:child_process';
import { join } from 'node:path';
import { app } from 'electron';

const APP_NAME: string = 'Orbit';
// Long enough to notice from across the desk; clicking it before then opens the chat.
const EXPIRE_MS: number = 6000;
// notify-send waits for the click until the notification expires or is dismissed; this caps a stuck daemon.
const WAIT_LIMIT_MS: number = EXPIRE_MS + 60_000;
// "default" is what swaync sends when the notification's body is clicked, not a button.
const OPEN_ACTION: string = 'default';
const SOUND_FILE: string = '/usr/share/sounds/freedesktop/stereo/service-login.oga';
// Half volume, as the Claude Code hook this replaces played it.
const SOUND_VOLUME: string = '32768';

// "<chat> needs you", with Orbit's name and icon and the chime the old Claude Code Stop hook played. Resolves true
// when the notification is clicked.
export function showNeedsYouNotification(chatName: string): Promise<boolean> {
  playChime();
  const args: string[] = [
    '--print-id', '--app-name', APP_NAME, '--urgency', 'normal', '--expire-time', String(EXPIRE_MS),
    '--icon', join(app.getAppPath(), 'assets', 'orbit-icon.svg'), '--action', `${OPEN_ACTION}=Open`,
    APP_NAME, `${chatName} needs you`,
  ];
  return new Promise((resolve: (clicked: boolean) => void): void => {
    execFile('notify-send', args, { timeout: WAIT_LIMIT_MS }, (error: Error | null, stdout: string): void => {
      resolve(error === null && stdout.split('\n').some((line: string) => line.trim() === OPEN_ACTION));
    });
  });
}

function playChime(): void {
  const player = spawn('paplay', [`--volume=${SOUND_VOLUME}`, SOUND_FILE], { stdio: 'ignore', detached: true });
  player.on('error', (): void => undefined);
  player.unref();
}
