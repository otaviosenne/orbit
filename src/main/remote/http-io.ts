import type { IncomingMessage, ServerResponse } from 'node:http';
import { contentSecurityPolicy } from './content-security';
import type { TrustedOrigins } from './trusted-origins';

// Generous for a few phone photos sent as base64, small enough that a stray upload cannot fill the memory.
export const MAX_BODY_BYTES: number = 25 * 1024 * 1024;

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

export function readBody(request: IncomingMessage, limit: number = MAX_BODY_BYTES): Promise<string> {
  return new Promise((resolve: (body: string) => void, reject: (error: Error) => void): void => {
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
    request.on('end', (): void => resolve(Buffer.concat(chunks).toString('utf8')));
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

export function sendEmpty(response: ServerResponse, status: number, headers: Readonly<Record<string, string>> = {}): void {
  response.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  response.end();
}

export function isJsonRequest(request: IncomingMessage): boolean {
  return (request.headers['content-type'] ?? '').split(';')[0]?.trim().toLowerCase() === 'application/json';
}
