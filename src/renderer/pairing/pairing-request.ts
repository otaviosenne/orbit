import type { PairingOffer } from '../../shared/remote-settings';
import { REMOTE_PAIRING_PATH } from '../../shared/remote-settings';

// Asks the computer for a one-time code; only a page already signed in to Orbit Web gets one.
export async function requestPairingOffer(): Promise<PairingOffer | null> {
  try {
    const response: Response = await fetch(REMOTE_PAIRING_PATH, { method: 'POST', credentials: 'same-origin' });
    return response.ok ? ((await response.json()) as PairingOffer) : null;
  } catch {
    return null;
  }
}
