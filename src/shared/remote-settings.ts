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
  // Every browser signed in to Orbit Web, the one seen most recently first.
  readonly devices: readonly RemoteDevice[];
}

// A browser signed in to Orbit Web: each sign-in, with the token or a pairing code, makes one.
export interface RemoteDevice {
  readonly id: string;
  // Read from the browser's User-Agent ("Chrome on Android"); only a hint, since a page can claim anything.
  readonly name: string;
  readonly createdAt: number;
  readonly lastSeenAt: number;
}

// Where the web app reports itself to the server; the desktop and the server agree on these paths.
export const REMOTE_API_PREFIX: string = '/api/call/';
export const REMOTE_SESSION_PATH: string = '/api/session';
// The phone reads the token from here once, then drops it from the address bar.
export const PAIRING_HASH_KEY: string = 'token';
export const REMOTE_PAIRING_PATH: string = '/api/pairing-code';
// GET: the device this browser is signed in as; DELETE on the session path signs it out.
export const REMOTE_DEVICE_PATH: string = '/api/device';

// A one-time code a signed-in device made for another one: typed at sign-in, or carried by the link and its QR code.
export interface PairingOffer {
  readonly code: string;
  readonly expiresAt: number;
  readonly link: string;
  // Drawn by the server from the link alone.
  readonly qrSvg: string;
}
