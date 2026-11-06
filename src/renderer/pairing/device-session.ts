import type { RemoteDevice } from '../../shared/remote-settings';
import { REMOTE_DEVICE_PATH, REMOTE_SESSION_PATH } from '../../shared/remote-settings';

// The device this browser is signed in as; null when the computer cannot say (signed out, or an Orbit from before
// devices existed, which answers 404 until it restarts).
export async function fetchThisDevice(): Promise<RemoteDevice | null> {
  try {
    const response: Response = await fetch(REMOTE_DEVICE_PATH, { credentials: 'same-origin' });
    return response.ok ? ((await response.json()) as RemoteDevice) : null;
  } catch {
    return null;
  }
}

// The computer forgets this device and the browser drops its cookie; false when the computer did not do it.
export async function signOutThisDevice(): Promise<boolean> {
  try {
    return (await fetch(REMOTE_SESSION_PATH, { method: 'DELETE', credentials: 'same-origin' })).ok;
  } catch {
    return false;
  }
}
