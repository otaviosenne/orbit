// 1024 frames at 16 kHz: 64 ms per chunk, so the first word leaves soon and the messages stay few.
const CHUNK_SECONDS: number = 1024 / 16000;
// A ScriptProcessorNode takes power-of-two buffers from 256 to 16384 frames.
const MIN_FRAMES_LOG2: number = 8;
const MAX_FRAMES_LOG2: number = 14;

// The processor buffer closest to one chunk's duration at the context's rate (1024 at 16 kHz, 4096 at 48 kHz).
export function framesPerChunk(sampleRate: number): number {
  const exponent: number = Math.round(Math.log2(sampleRate * CHUNK_SECONDS));
  return 2 ** Math.min(MAX_FRAMES_LOG2, Math.max(MIN_FRAMES_LOG2, exponent));
}
