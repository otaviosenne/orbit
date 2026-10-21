import { describe, expect, it } from 'vitest';
import { pcmLevel } from '../src/renderer/sheet/hands-free/pcm-level';
import { MAX_OVERRUN_MS, MAX_SEGMENT_MS, PAUSE_MS, QUIET_GAP_MS, SILENCE_LEVEL, SegmentClock } from '../src/renderer/sheet/hands-free/segment-clock';

const LOUD: number = SILENCE_LEVEL * 10;
const QUIET: number = 0;

describe('SegmentClock', () => {
  it('ends a segment after a pause in the words once the room is quiet', () => {
    const clock: SegmentClock = new SegmentClock(0);
    clock.heard(LOUD, 100);
    clock.wrote(200);
    clock.heard(QUIET, 300);
    expect(clock.due(200 + PAUSE_MS - 1)).toBeNull();
    expect(clock.due(200 + PAUSE_MS)).toBe('pause');
  });

  it('does not end on silence before any words were heard', () => {
    const clock: SegmentClock = new SegmentClock(0);
    clock.heard(QUIET, 0);
    expect(clock.due(PAUSE_MS * 10)).toBeNull();
  });

  it('does not take a lull in the transcript for a pause while the voice goes on', () => {
    const clock: SegmentClock = new SegmentClock(0);
    clock.wrote(100);
    clock.heard(LOUD, 100 + PAUSE_MS);
    expect(clock.due(100 + PAUSE_MS)).toBeNull();
  });

  it('cuts a long segment at the next quiet moment after its maximum length', () => {
    const clock: SegmentClock = new SegmentClock(0);
    clock.heard(LOUD, MAX_SEGMENT_MS);
    expect(clock.due(MAX_SEGMENT_MS)).toBeNull();
    clock.heard(QUIET, MAX_SEGMENT_MS + 1);
    expect(clock.due(MAX_SEGMENT_MS + QUIET_GAP_MS)).toBeNull();
    expect(clock.due(MAX_SEGMENT_MS + 1 + QUIET_GAP_MS)).toBe('length');
  });

  it('cuts anyway when the room never goes quiet', () => {
    const clock: SegmentClock = new SegmentClock(0);
    clock.heard(LOUD, MAX_SEGMENT_MS + MAX_OVERRUN_MS);
    expect(clock.due(MAX_SEGMENT_MS + MAX_OVERRUN_MS - 1)).toBeNull();
    expect(clock.due(MAX_SEGMENT_MS + MAX_OVERRUN_MS)).toBe('length');
  });
});

describe('pcmLevel', () => {
  it('measures a chunk of 16-bit samples as RMS from 0 to 1', () => {
    expect(pcmLevel(new Uint8Array(new Int16Array([0, 0, 0, 0]).buffer))).toBe(0);
    expect(pcmLevel(new Uint8Array(new Int16Array([16384, -16384]).buffer))).toBeCloseTo(0.5);
    expect(pcmLevel(new Uint8Array(0))).toBe(0);
  });
});
