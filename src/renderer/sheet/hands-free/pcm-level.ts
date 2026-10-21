const BYTES_PER_SAMPLE: number = 2;
const INT16_FULL_SCALE: number = 0x8000;
const LITTLE_ENDIAN: boolean = true;

// Loudness of one 16-bit mono PCM chunk as RMS: 0 is silence, 1 full scale.
export function pcmLevel(pcm: Uint8Array): number {
  const count: number = Math.floor(pcm.byteLength / BYTES_PER_SAMPLE);
  if (count === 0) return 0;
  const view: DataView = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let sumOfSquares: number = 0;
  for (let index: number = 0; index < count; index++) {
    const sample: number = view.getInt16(index * BYTES_PER_SAMPLE, LITTLE_ENDIAN) / INT16_FULL_SCALE;
    sumOfSquares += sample * sample;
  }
  return Math.sqrt(sumOfSquares / count);
}
