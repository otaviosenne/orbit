import type { IncomingMessage, ServerResponse } from 'node:http';
import { formatMegabytes } from '../../shared/attachment-limits';
import { REMOTE_CLIPBOARD_PATH, REMOTE_CLIPBOARD_SWAP_PATH } from '../../shared/remote-settings';
import { MAX_SHARED_IMAGE_BYTES, MAX_SHARED_TEXT_BYTES } from '../shared-clipboard/clipboard-limits';
import type { ClipboardRead } from '../shared-clipboard/pc-clipboard';
import type { PhoneContent } from '../shared-clipboard/phone-content';
import { parsePhoneContent } from '../shared-clipboard/phone-content';
import { bearerCredential } from './bearer';
import { readBodyBytes, sendBytes, sendEmpty, sendText } from './http-io';
import type { RemoteContext, RemoteCredentials } from './remote-context';

const MS_PER_SECOND: number = 1000;
const TOO_LARGE: string = `Over ${formatMegabytes(MAX_SHARED_TEXT_BYTES)} of text or ${formatMegabytes(MAX_SHARED_IMAGE_BYTES)} of image: not shared.`;
// What the Shortcut gets back, as a sentence it can show or copy: Shortcuts hands on the body even of a refusal.
const READ_REFUSALS: Readonly<Record<Exclude<ClipboardRead['kind'], 'text' | 'image' | 'empty'>, readonly [number, string]>> = {
  secret: [403, 'The PC clipboard holds an Orbit secret; it stays on the PC.'],
  unsupported: [415, 'The PC clipboard holds neither text nor an image.'],
  'too-large': [413, TOO_LARGE],
};

// What became of the body the phone sent.
type Taken = { readonly kind: 'copied' } | { readonly kind: 'nothing' } | { readonly kind: 'refused'; readonly status: number; readonly message: string };

export function isClipboardPath(path: string): boolean {
  return path === REMOTE_CLIPBOARD_PATH || path === REMOTE_CLIPBOARD_SWAP_PATH;
}

// GET /api/clipboard sends the PC clipboard as plain text or as the image itself; POST puts the body's text or image
// on it; POST /api/clipboard/swap does both at once. Only a Shortcuts credential in the Authorization header gets in,
// never a cookie, so no other site's page can make a browser call it, and the missing Origin of a Shortcut's request
// is no risk here.
export async function handleClipboard(request: IncomingMessage, response: ServerResponse, context: RemoteContext, path: string): Promise<void> {
  const swap: boolean = path === REMOTE_CLIPBOARD_SWAP_PATH;
  if (swap && request.method !== 'POST') return sendText(response, 405, 'Use POST.');
  if (request.method !== 'GET' && request.method !== 'POST') return sendText(response, 405, 'Use GET or POST.');
  const now: number = context.now();
  if (context.limiter.isLocked(now)) {
    response.setHeader('Retry-After', String(Math.ceil(context.limiter.retryAfterMs(now) / MS_PER_SECOND)));
    return sendText(response, 429, 'Too many wrong tokens; try again later.');
  }
  if (!isShortcutsRequest(request, context.credentials(), now)) {
    context.limiter.recordFailure(now);
    return sendText(response, 401, 'Wrong or missing token.');
  }
  if (swap) return swapClipboards(request, response, context);
  if (request.method === 'GET') return sendClipboard(response, await context.clipboard.read());
  return receiveContent(request, response, context);
}

function isShortcutsRequest(request: IncomingMessage, credentials: RemoteCredentials, now: number): boolean {
  const credential: string | null = bearerCredential(request.headers.authorization);
  return credential !== null && credentials.devices.verify(credential, now, 'shortcuts') !== null;
}

function sendClipboard(response: ServerResponse, read: ClipboardRead): void {
  if (read.kind === 'text') return sendText(response, 200, read.text);
  if (read.kind === 'image') return sendBytes(response, 200, read.mimeType, read.bytes);
  // Nothing to hand over: the Shortcut gets an empty answer, not a sentence that would replace the phone's clipboard.
  if (read.kind === 'empty') return sendEmpty(response, 204);
  const [status, message] = READ_REFUSALS[read.kind];
  sendText(response, status, message);
}

async function receiveContent(request: IncomingMessage, response: ServerResponse, context: RemoteContext): Promise<void> {
  const taken: Taken = await takePhoneContent(request, context);
  if (taken.kind === 'refused') return sendText(response, taken.status, taken.message);
  if (taken.kind === 'nothing') return sendText(response, 400, 'Nothing to copy.');
  sendText(response, 200, 'Copied to the PC.');
}

// The PC clipboard is read before the phone's lands on it, so each side gets what the other held. An empty phone
// clipboard leaves the PC's alone; a PC clipboard with nothing to give (empty, a secret, a file list) answers 204, so
// the Shortcut's "has any value" check keeps the phone's clipboard as it was.
async function swapClipboards(request: IncomingMessage, response: ServerResponse, context: RemoteContext): Promise<void> {
  const pc: ClipboardRead = await context.clipboard.read();
  const taken: Taken = await takePhoneContent(request, context);
  if (taken.kind === 'refused') return sendText(response, taken.status, taken.message);
  if (pc.kind === 'text') return sendText(response, 200, pc.text);
  if (pc.kind === 'image') return sendBytes(response, 200, pc.mimeType, pc.bytes);
  sendEmpty(response, 204);
}

async function takePhoneContent(request: IncomingMessage, context: RemoteContext): Promise<Taken> {
  let body: Buffer;
  try {
    body = await readBodyBytes(request, MAX_SHARED_IMAGE_BYTES);
  } catch {
    return { kind: 'refused', status: 413, message: TOO_LARGE };
  }
  const parsed: PhoneContent = parsePhoneContent(request.headers['content-type'], body);
  if (parsed.kind === 'too-large') return { kind: 'refused', status: 413, message: TOO_LARGE };
  if (parsed.kind === 'unsupported') return { kind: 'refused', status: 415, message: 'Send an image, text/plain, JSON {"text": …} or a form field named text.' };
  if (parsed.kind === 'malformed') return { kind: 'refused', status: 400, message: 'No text field in the body.' };
  if (parsed.kind === 'image') return copyImage(context, parsed.bytes);
  if (parsed.text.length === 0) return { kind: 'nothing' };
  await context.clipboard.write(parsed.text);
  context.notifyPhoneCopy();
  return { kind: 'copied' };
}

async function copyImage(context: RemoteContext, image: Buffer): Promise<Taken> {
  try {
    await context.clipboard.writeImage(image);
  } catch {
    return { kind: 'refused', status: 415, message: 'The PC could not read that image.' };
  }
  context.notifyPhoneCopy();
  return { kind: 'copied' };
}
