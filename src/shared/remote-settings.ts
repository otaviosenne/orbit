// What Settings shows about Orbit Web. The token is here because only the desktop window ever asks for it.
export interface RemoteSettings {
  readonly enabled: boolean;
  // Listening right now; false with an error when the port was taken.
  readonly running: boolean;
  readonly localUrl: string;
  readonly port: number;
  // The user's public address in front of a tunnel or proxy; empty until they type it.
  readonly externalUrl: string;
  readonly token: string;
  // <external url>/#token=…, null without an external URL (127.0.0.1 is useless from a phone).
  readonly pairingUrl: string | null;
  // The pairing URL as an SVG QR code, drawn locally; null whenever pairingUrl is.
  readonly pairingQrSvg: string | null;
  readonly error: string | null;
}

// Where the web app reports itself to the server; the desktop and the server agree on these paths.
export const REMOTE_API_PREFIX: string = '/api/call/';
export const REMOTE_SESSION_PATH: string = '/api/session';
// The phone reads the token from here once, then drops it from the address bar.
export const PAIRING_HASH_KEY: string = 'token';
