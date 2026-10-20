import { describe, expect, it } from 'vitest';
import { flipOffsets } from '../src/renderer/views/timeline-lines/flip-offsets';

describe('flipOffsets', () => {
  it('pushes each moved element back by how far it moved', () => {
    const before: Map<string, number> = new Map([['a', 0], ['b', 50]]);
    const after: Map<string, number> = new Map([['a', 50], ['b', 0]]);
    expect([...flipOffsets(before, after, 1)]).toEqual([['a', -50], ['b', 50]]);
  });

  it('leaves new elements and those that barely moved alone', () => {
    const before: Map<string, number> = new Map([['a', 0], ['gone', 100]]);
    const after: Map<string, number> = new Map([['a', 0.4], ['new', 50]]);
    expect(flipOffsets(before, after, 1).size).toBe(0);
  });
});
