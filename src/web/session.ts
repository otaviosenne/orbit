import { PAIRING_HASH_KEY, REMOTE_SESSION_PATH } from '../shared/remote-settings';

export type SignInOutcome = 'ok' | 'wrong' | 'locked' | 'unreachable';

const NO_CONTENT: number = 204;
const TOO_MANY: number = 429;
const UNAUTHORIZED: number = 401;

export async function hasSession(): Promise<boolean> {
  try {
    return (await fetch(REMOTE_SESSION_PATH, { credentials: 'same-origin' })).status === NO_CONTENT;
  } catch {
    return false;
  }
}

// The server answers with the session cookie; the token itself is never stored in the browser.
export async function signIn(token: string): Promise<SignInOutcome> {
  try {
    const response: Response = await fetch(REMOTE_SESSION_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ token: token.trim() }),
    });
    if (response.status === NO_CONTENT) return 'ok';
    if (response.status === TOO_MANY) return 'locked';
    return response.status === UNAUTHORIZED ? 'wrong' : 'unreachable';
  } catch {
    return 'unreachable';
  }
}

// The QR code opens <url>/#token=…; the fragment never reaches a server or a log, and is wiped from the address bar
// and history before anything else runs.
export function takePairingToken(): string | null {
  const params: URLSearchParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token: string | null = params.get(PAIRING_HASH_KEY);
  if (window.location.hash.length > 0) history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  return token;
}
