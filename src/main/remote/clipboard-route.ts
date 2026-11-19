import type { IncomingMessage, ServerResponse } from 'node:http';
import { formatMegabytes } from '../../shared/attachment-limits';
import { MAX_SHARED_TEXT_BYTES } from '../shared-clipboard/clipboard-limits';
import type { ClipboardRead } from '../shared-clipboard/pc-clipboard';
import type { PhoneText } from '../shared-clipboard/phone-text';
import { parsePhoneText } from '../shared-clipboard/phone-text';
import { bearerCredential } from './bearer';
import { readBody, sendEmpty, sendText } from './http-io';
import type { RemoteContext, RemoteCredentials } from './remote-context';

const MS_PER_SECOND: number = 1000;
const TOO_LARGE: string = `Over ${formatMegabytes(MAX_SHARED_TEXT_BYTES)}: not shared.`;
// What the Shortcut gets back, as a sentence it can show or copy: Shortcuts hands on the body even of a refusal.
const READ_REFUSALS: Readonly<Record<Exclude<ClipboardRead['kind'], 'text' | 'empty'>, readonly [number, string]>> = {
  secret: [403, 'The PC clipboard holds an Orbit secret; it stays on the PC.'],
  'not-text': [415, 'The PC clipboard holds no text.'],
  'too-large': [413, TOO_LARGE],
};

// GET /api/clipboard sends the PC clipboard as plain text; POST puts the body's text on it. Only a Shortcuts
// credential in the Authorization header gets in, never a cookie, so no other site's page can make a browser call it,
// and the missing Origin of a Shortcut's request is no risk here.
export async function handleClipboard(request: IncomingMessage, response: ServerResponse, context: RemoteContext): Promise<void> {
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
  if (request.method === 'GET') return sendClipboard(response, await context.clipboard.read());
  return receiveText(request, response, context);
}

function isShortcutsRequest(request: IncomingMessage, credentials: RemoteCredentials, now: number): boolean {
  const credential: string | null = bearerCredential(request.headers.authorization);
  return credential !== null && credentials.devices.verify(credential, now, 'shortcuts') !== null;
}

function sendClipboard(response: ServerResponse, read: ClipboardRead): void {
  if (read.kind === 'text') return sendText(response, 200, read.text);
  // Nothing to hand over: the Shortcut gets an empty answer, not a sentence that would replace the phone's clipboard.
  if (read.kind === 'empty') return sendEmpty(response, 204);
  const [status, message] = READ_REFUSALS[read.kind];
  sendText(response, status, message);
}

async function receiveText(request: IncomingMessage, response: ServerResponse, context: RemoteContext): Promise<void> {
  let body: string;
  try {
    body = await readBody(request, MAX_SHARED_TEXT_BYTES);
  } catch {
    return sendText(response, 413, TOO_LARGE);
  }
  const parsed: PhoneText = parsePhoneText(request.headers['content-type'], body);
  if (parsed.kind === 'unsupported') return sendText(response, 415, 'Send text/plain, JSON {"text": …} or a form field named text.');
  if (parsed.kind === 'malformed') return sendText(response, 400, 'No text field in the body.');
  if (parsed.text.length === 0) return sendText(response, 400, 'Nothing to copy.');
  await context.clipboard.write(parsed.text);
  sendText(response, 200, 'Copied to the PC.');
  context.notifyPhoneCopy();
}
