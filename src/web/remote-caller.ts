import type { RemoteChannel } from '../shared/remote-access';
import { REMOTE_API_PREFIX } from '../shared/remote-settings';
import { decodeWire, encodeWire } from '../shared/wire-codec';

const UNAUTHORIZED: number = 401;

export type RemoteCall = <T>(channel: RemoteChannel, args: readonly unknown[]) => Promise<T>;

export class SignedOutError extends Error {}

// One POST per call, arguments as a JSON array, like an IPC invoke over HTTP. The session cookie rides along on its
// own (same origin), and a 401 means the token changed or the cookie expired.
export function createRemoteCall(fetcher: typeof fetch, onSignedOut: () => void): RemoteCall {
  return async <T>(channel: RemoteChannel, args: readonly unknown[]): Promise<T> => {
    const response: Response = await fetcher(`${REMOTE_API_PREFIX}${channel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: encodeWire(args),
    });
    if (response.status === UNAUTHORIZED) {
      onSignedOut();
      throw new SignedOutError('Signed out');
    }
    if (!response.ok) throw new Error(`${channel} failed: ${response.status}`);
    return decodeWire(await response.text()) as T;
  };
}
