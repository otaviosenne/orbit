import { MAX_AUDIO_FRAME_BYTES } from '../../../shared/dictation-audio-frame';

export interface DictationLimits {
  // Browsers dictating at once.
  readonly maxClients: number;
  // Largest WebSocket message read into memory.
  readonly maxMessageBytes: number;
  // A live session that stops getting audio this long after it began streaming was left behind.
  readonly audioIdleMs: number;
  // No session runs longer than this, held or not.
  readonly maxSessionMs: number;
  // A socket with no live session and no message for this long is closed; the browser reconnects on demand.
  readonly connectionIdleMs: number;
  // Ping interval; a browser that missed the previous ping is gone (a locked phone often never says goodbye).
  readonly heartbeatMs: number;
}

const SECOND_MS: number = 1000;
const MINUTE_MS: number = 60 * SECOND_MS;

export const DICTATION_LIMITS: DictationLimits = {
  // A phone, a tablet and a laptop, plus a phone's own half-dead socket from before its screen locked.
  maxClients: 4,
  maxMessageBytes: MAX_AUDIO_FRAME_BYTES,
  // The recorder sends a chunk every few dozen milliseconds, silence included.
  audioIdleMs: 10 * SECOND_MS,
  // Hands-free cuts its sessions within a minute; a held push-to-talk this long is a stuck key.
  maxSessionMs: 15 * MINUTE_MS,
  connectionIdleMs: 3 * MINUTE_MS,
  // Well under the ~100 s a Cloudflare tunnel lets a silent WebSocket live.
  heartbeatMs: 20 * SECOND_MS,
};
