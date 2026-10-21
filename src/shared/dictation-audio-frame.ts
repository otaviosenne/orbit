import { isWireId } from './dictation-protocol';

// A binary frame is the session it belongs to (32-bit little-endian), then 16-bit PCM at 16 kHz.
const SESSION_BYTES: number = 4;
const BYTES_PER_SAMPLE: number = 2;
const LITTLE_ENDIAN: boolean = true;
// About two seconds of audio; the recorder sends well under a tenth of a second at a time, so only a misbehaving
// client gets near it, and the server reads no more than this into memory per message.
export const MAX_AUDIO_FRAME_BYTES: number = 64 * 1024;

export interface AudioFrame {
  readonly session: number;
  readonly pcm: Uint8Array;
}

export function encodeAudioFrame(session: number, pcm: Uint8Array): Uint8Array<ArrayBuffer> {
  const frame: Uint8Array<ArrayBuffer> = new Uint8Array(SESSION_BYTES + pcm.byteLength);
  new DataView(frame.buffer).setUint32(0, session, LITTLE_ENDIAN);
  frame.set(pcm, SESSION_BYTES);
  return frame;
}

// null for anything that is not a whole number of samples for one session, or that is larger than any real chunk.
export function decodeAudioFrame(frame: Uint8Array): AudioFrame | null {
  if (frame.byteLength > MAX_AUDIO_FRAME_BYTES) return null;
  const pcmBytes: number = frame.byteLength - SESSION_BYTES;
  if (pcmBytes <= 0 || pcmBytes % BYTES_PER_SAMPLE !== 0) return null;
  const session: number = new DataView(frame.buffer, frame.byteOffset, frame.byteLength).getUint32(0, LITTLE_ENDIAN);
  if (!isWireId(session)) return null;
  return { session, pcm: frame.subarray(SESSION_BYTES) };
}
