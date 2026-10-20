import { afterEach, describe, expect, it } from 'vitest';
import { loadTimelineMode, parseTimelineMode, saveTimelineMode } from '../src/renderer/views/timeline-mode';

function fakeStorage(initial: string | null): Map<string, string> {
  const store: Map<string, string> = new Map(initial === null ? [] : [['orbit.timeline-mode', initial]]);
  globalThis.localStorage = {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => void store.set(key, value),
  } as unknown as Storage;
  return store;
}

describe('timeline mode', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('defaults to bars and ignores unknown values', () => {
    expect(parseTimelineMode(null)).toBe('bars');
    expect(parseTimelineMode('dots')).toBe('bars');
    expect(parseTimelineMode('lines')).toBe('lines');
  });

  it('remembers the picked mode', () => {
    const store: Map<string, string> = fakeStorage(null);
    saveTimelineMode('lines');
    expect(store.get('orbit.timeline-mode')).toBe('lines');
    expect(loadTimelineMode()).toBe('lines');
  });

  it('falls back to bars when storage is unavailable', () => {
    expect(loadTimelineMode()).toBe('bars');
  });
});
