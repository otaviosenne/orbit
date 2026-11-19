import type { IncomingMessage, ServerResponse } from 'node:http';
import { REMOTE_BODY_LIMIT_BYTES } from '../../shared/attachment-limits';
import { contentSecurityPolicy } from './content-security';
import type { TrustedOrigins } from './trusted-origins';

// Sized with the attachments a phone may send (shared/attachment-limits.ts).
export const MAX_BODY_BYTES: number = REMOTE_BODY_LIMIT_BYTES;

export class BodyTooLargeError extends Error {}

// Sent with every response: no framing (a framed remote terminal is a clickjacking target), no sniffing, no referrer.
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export function applySecurityHeaders(response: ServerResponse, trusted: TrustedOrigins): void {
  response.setHeader('Content-Security-Policy', contentSecurityPolicy(trusted.origins));
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value);
}

export async function readBody(request: IncomingMessage, limit: number = MAX_BODY_BYTES): Promise<string> {
  return (await readBodyBytes(request, limit)).toString('utf8');
}

// The raw bytes, for a body that may be an image rather than text.
export function readBodyBytes(request: IncomingMessage, limit: number = MAX_BODY_BYTES): Promise<Buffer> {
  return new Promise((resolve: (body: Buffer) => void, reject: (error: Error) => void): void => {
    const chunks: Buffer[] = [];
    let size: number = 0;
    request.on('data', (chunk: Buffer): void => {
      size += chunk.length;
      if (size > limit) {
        reject(new BodyTooLargeError('Request body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', (): void => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

// API answers hold chat contents, so no cache along the way may keep them.
export function sendJson(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(body);
}

export function sendError(response: ServerResponse, status: number, message: string): void {
  sendJson(response, status, JSON.stringify({ error: message }));
}

// For callers that show the body as is, such as an iPhone Shortcut copying the answer: a sentence, not JSON.
export function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(text);
}

// Raw bytes such as an image, for a Shortcut that copies the answer as it comes.
export function sendBytes(response: ServerResponse, status: number, contentType: string, bytes: Buffer): void {
  response.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  response.end(bytes);
}

export function sendEmpty(response: ServerResponse, status: number, headers: Readonly<Record<string, string>> = {}): void {
  response.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  response.end();
}

export function isJsonRequest(request: IncomingMessage): boolean {
  return (request.headers['content-type'] ?? '').split(';')[0]?.trim().toLowerCase() === 'application/json';
}
