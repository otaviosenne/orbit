import { describe, expect, it } from 'vitest';
import { framesPerChunk } from '../src/renderer/sheet/capture-chunk';
import { PcmResampler } from '../src/renderer/sheet/pcm-resampler';

const VOICE_RATE: number = 16000;
const IPHONE_RATE: number = 48000;
const CD_RATE: number = 44100;
const PRECISION: number = 6;

function ramp(length: number): Float32Array {
  return Float32Array.from({ length }, (_: unknown, index: number) => index / length);
}

function inChunks(resampler: PcmResampler, input: Float32Array, sizes: readonly number[]): number[] {
  const output: number[] = [];
  let at: number = 0;
  for (const size of sizes) {
    output.push(...resampler.process(input.subarray(at, at + size)));
    at += size;
  }
  return output;
}

describe('microphone resampling', () => {
  it('passes 16 kHz audio through untouched', () => {
    const input: Float32Array = ramp(1024);
    expect(new PcmResampler(VOICE_RATE, VOICE_RATE).process(input)).toBe(input);
  });

  it('averages each group of three samples from 48 kHz', () => {
    const output: Float32Array = new PcmResampler(IPHONE_RATE, VOICE_RATE).process(Float32Array.from([0.3, 0.6, 0.9, -0.3, -0.3, -0.3]));
    expect(output).toHaveLength(2);
    expect(output[0]).toBeCloseTo(0.6, PRECISION);
    expect(output[1]).toBeCloseTo(-0.3, PRECISION);
  });

  it('gives the same audio whatever the chunk sizes', () => {
    const input: Float32Array = ramp(4410);
    const whole: number[] = inChunks(new PcmResampler(CD_RATE, VOICE_RATE), input, [4410]);
    const split: number[] = inChunks(new PcmResampler(CD_RATE, VOICE_RATE), input, [1, 999, 2048, 1362]);
    expect(split).toHaveLength(whole.length);
    split.forEach((sample: number, index: number) => expect(sample).toBeCloseTo(whole[index] ?? Number.NaN, PRECISION));
  });

  it('keeps time over a long stream at 44.1 kHz', () => {
    const resampler: PcmResampler = new PcmResampler(CD_RATE, VOICE_RATE);
    let produced: number = 0;
    for (let second: number = 0; second < 10; second += 1) produced += resampler.process(new Float32Array(CD_RATE)).length;
    expect(Math.abs(produced - 10 * VOICE_RATE)).toBeLessThanOrEqual(1);
  });

  it('picks a processor buffer of about 64 ms at the device rate', () => {
    expect(framesPerChunk(VOICE_RATE)).toBe(1024);
    expect(framesPerChunk(IPHONE_RATE)).toBe(4096);
    expect(framesPerChunk(CD_RATE)).toBe(2048);
  });
});
