import { afterEach, describe, expect, it } from 'vitest';
import { loadTimelineRange, parseTimelineRange, saveTimelineRange } from '../src/renderer/views/timeline-range';

function fakeStorage(initial: string | null): Map<string, string> {
  const store: Map<string, string> = new Map(initial === null ? [] : [['orbit.timeline-range', initial]]);
  globalThis.localStorage = {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => void store.set(key, value),
  } as unknown as Storage;
  return store;
}

describe('parseTimelineRange', () => {
  it('defaults to the last hour when nothing was stored', () => {
    expect(parseTimelineRange(null)).toBe('1h');
  });

  it('ignores values that are not a known range', () => {
    expect(parseTimelineRange('12h')).toBe('1h');
    expect(parseTimelineRange('')).toBe('1h');
  });

  it('keeps a stored range', () => {
    expect(parseTimelineRange('6h')).toBe('6h');
  });
});

describe('timeline range storage', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('round-trips the chosen range', () => {
    const store: Map<string, string> = fakeStorage(null);
    saveTimelineRange('2h');
    expect(store.get('orbit.timeline-range')).toBe('2h');
    expect(loadTimelineRange()).toBe('2h');
  });

  it('falls back to the default when storage is unavailable', () => {
    globalThis.localStorage = {
      getItem: (): never => {
        throw new Error('blocked');
      },
      setItem: (): never => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(loadTimelineRange()).toBe('1h');
    expect(() => saveTimelineRange('3h')).not.toThrow();
  });
});
