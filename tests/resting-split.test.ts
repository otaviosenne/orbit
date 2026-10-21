import { describe, expect, it } from 'vitest';
import { restingHeights } from '../src/renderer/board/resting-split';

const H: number = 1000;

describe('restingHeights', () => {
  it('gives each column what it needs while both fit, the rest to Idle', () => {
    expect(restingHeights(H, 300, 200)).toEqual({ active: 300, idle: 700 });
  });

  it('splits 60/40 when both overflow', () => {
    expect(restingHeights(H, 900, 900)).toEqual({ active: 600, idle: 400 });
  });

  it('lets a full Idle take what a short Active leaves', () => {
    expect(restingHeights(H, 200, 2000)).toEqual({ active: 200, idle: 800 });
  });

  it('lets a full Active take what a short Idle leaves', () => {
    expect(restingHeights(H, 2000, 150)).toEqual({ active: 850, idle: 150 });
  });
});
