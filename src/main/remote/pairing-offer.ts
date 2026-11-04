import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PairingOffer } from '../../shared/remote-settings';
import { PAIRING_HASH_KEY } from '../../shared/remote-settings';
import { sendError, sendJson } from './http-io';
import { pairingQrSvg } from './pairing-qr';
import type { RemoteContext } from './remote-context';
import { isSignedIn } from './sign-in';

// POST /api/pairing-code, from a signed-in device: a one-time code for another device, with the link and QR code
// that carry it. The link points at the address this device used, so it works wherever that one did.
export function handlePairingOffer(request: IncomingMessage, response: ServerResponse, context: RemoteContext): void {
  if (request.method !== 'POST') return sendError(response, 405, 'Method not allowed');
  if (!isSignedIn(request, context.credentials())) return sendError(response, 401, 'Sign in first');
  const { code, expiresAt } = context.pairing.issue(context.now());
  const link: string = `${siteOf(request)}/#${PAIRING_HASH_KEY}=${code}`;
  const offer: PairingOffer = { code, expiresAt, link, qrSvg: pairingQrSvg(link) };
  sendJson(response, 200, JSON.stringify(offer));
}

// The tunnel serves HTTPS and passes the host along; only the local address is plain HTTP.
function siteOf(request: IncomingMessage): string {
  const host: string = request.headers.host ?? '';
  const isLocal: boolean = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host);
  return `${isLocal ? 'http' : 'https'}://${host}`;
}
