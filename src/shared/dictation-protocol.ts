import type { DictationStart, TranscriptionResult } from './types';

// Orbit Web's dictation socket: the same five steps the desktop window takes over IPC, on one WebSocket per browser.
export const DICTATION_SOCKET_PATH: string = '/api/dictation';
// A control message is a few short fields; anything longer is not one of them.
export const MAX_CONTROL_MESSAGE_LENGTH: number = 256;
// Ids and sessions travel in a 32-bit frame header, so neither side ever produces a larger one.
export const MAX_WIRE_ID: number = 0xffff_ffff;

// Browser → Orbit. start and finish carry an id so their answers can be matched; they may come back out of order.
export type DictationRequest =
  | { readonly type: 'prepare' }
  | { readonly type: 'start'; readonly id: number }
  | { readonly type: 'finish'; readonly id: number; readonly session: number }
  | { readonly type: 'cancel'; readonly session: number };

// Orbit → browser.
export type DictationReply =
  | { readonly type: 'started'; readonly id: number; readonly start: DictationStart }
  | { readonly type: 'finished'; readonly id: number; readonly result: TranscriptionResult }
  | { readonly type: 'transcript'; readonly session: number; readonly text: string };

export function isWireId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_WIRE_ID;
}

// Anything that is not exactly one of the four requests is refused, so the server never acts on a guess.
export function parseDictationRequest(raw: string): DictationRequest | null {
  if (raw.length > MAX_CONTROL_MESSAGE_LENGTH) return null;
  const message: Record<string, unknown> | null = parseObject(raw);
  switch (message?.['type']) {
    case 'prepare':
      return { type: 'prepare' };
    case 'start':
      return isWireId(message['id']) ? { type: 'start', id: message['id'] } : null;
    case 'finish':
      return isWireId(message['id']) && isWireId(message['session']) ? { type: 'finish', id: message['id'], session: message['session'] } : null;
    case 'cancel':
      return isWireId(message['session']) ? { type: 'cancel', session: message['session'] } : null;
    default:
      return null;
  }
}

// The browser trusts its own server, but a reply it cannot read is still dropped rather than half-applied.
export function parseDictationReply(raw: string): DictationReply | null {
  const message: Record<string, unknown> | null = parseObject(raw);
  switch (message?.['type']) {
    case 'started':
      return isWireId(message['id']) && isDictationStart(message['start']) ? { type: 'started', id: message['id'], start: message['start'] } : null;
    case 'finished':
      return isWireId(message['id']) && isTranscriptionResult(message['result'])
        ? { type: 'finished', id: message['id'], result: message['result'] }
        : null;
    case 'transcript':
      return isWireId(message['session']) && typeof message['text'] === 'string'
        ? { type: 'transcript', session: message['session'], text: message['text'] }
        : null;
    default:
      return null;
  }
}

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function isDictationStart(value: unknown): value is DictationStart {
  if (typeof value !== 'object' || value === null) return false;
  const start: Record<string, unknown> = value as Record<string, unknown>;
  return isWireId(start['session']) && isNullableText(start['error']);
}

function isTranscriptionResult(value: unknown): value is TranscriptionResult {
  if (typeof value !== 'object' || value === null) return false;
  const result: Record<string, unknown> = value as Record<string, unknown>;
  return typeof result['ok'] === 'boolean' && typeof result['text'] === 'string' && isNullableText(result['error']);
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
