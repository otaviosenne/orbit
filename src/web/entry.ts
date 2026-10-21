import { markWebHost } from '../renderer/host';
import { applyTheme, loadTheme } from '../renderer/theme';
import { dictationSocketUrl } from './dictation/socket-url';
import { RemoteDictation } from './dictation/remote-dictation';
import { createHttpRadar } from './http-radar';
import { installMobileLayout } from './mobile/mobile-layout';
import { createRemoteCall } from './remote-caller';
import { hasSession, signIn, takePairingToken } from './session';
import { showSignInForm } from './sign-in-form';

// Orbit Web: the desktop renderer, unchanged, with window.radar answered over HTTP instead of Electron IPC.
// app.ts polls window.radar as soon as it loads, so it is imported only once signed in and wired.
async function start(): Promise<void> {
  markWebHost();
  // The sign-in card shows before the app, so it takes the saved theme itself.
  applyTheme(loadTheme());
  await ensureSignedIn();
  const voice: RemoteDictation = new RemoteDictation((): string => dictationSocketUrl(window.location), (url: string): WebSocket => new WebSocket(url));
  Object.defineProperty(window, 'radar', { value: createHttpRadar(createRemoteCall(fetch.bind(window), onSignedOut), voice) });
  installMobileLayout();
  await import('../renderer/app');
}

async function ensureSignedIn(): Promise<void> {
  const pairingToken: string | null = takePairingToken();
  if (pairingToken !== null && (await signIn(pairingToken)) === 'ok') return;
  if (await hasSession()) return;
  await showSignInForm();
}

let signingIn: boolean = false;

// A new token on the desktop signs every phone out; once signed in again, the app starts over clean.
function onSignedOut(): void {
  if (signingIn) return;
  signingIn = true;
  void showSignInForm().then((): void => window.location.reload());
}

void start();
