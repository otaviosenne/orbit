import { describe, expect, it } from 'vitest';
import { ImageCache } from '../src/renderer/sheet/image-cache';

interface Harness {
  readonly cache: ImageCache;
  readonly calls: string[];
  readonly released: string[];
}

const harness = (respond: (key: string) => string | null = (key: string) => `data:${key}`): Harness => {
  const calls: string[] = [];
  const released: string[] = [];
  const cache: ImageCache = new ImageCache(async (sessionId: string, key: string): Promise<string | null> => {
    calls.push(`${sessionId}/${key}`);
    return respond(key);
  }, (source: string): void => void released.push(source));
  return { cache, calls, released };
};

describe('ImageCache', () => {
  it('fetches an image once and then serves it synchronously', async () => {
    const { cache, calls } = harness();
    expect(cache.get('k')).toBeUndefined();
    const [first, second] = await Promise.all([cache.load('s', 'k'), cache.load('s', 'k')]);
    expect([first, second]).toEqual(['data:k', 'data:k']);
    expect(cache.get('k')).toBe('data:k');
    await cache.load('s', 'k');
    expect(calls).toEqual(['s/k']);
  });

  it('remembers an image that could not be fetched instead of asking again', async () => {
    const { cache, calls } = harness(() => null);
    expect(await cache.load('s', 'k')).toBeNull();
    expect(await cache.load('s', 'k')).toBeNull();
    expect(cache.get('k')).toBeUndefined();
    expect(calls).toHaveLength(1);
  });

  it('treats a failing fetch as missing', async () => {
    const cache: ImageCache = new ImageCache(() => Promise.reject(new Error('gone')), () => undefined);
    expect(await cache.load('s', 'k')).toBeNull();
  });

  it('serves a seeded source without fetching, and releases it when cleared', async () => {
    const { cache, calls, released } = harness();
    cache.seed('k', 'blob:local');
    expect(await cache.load('s', 'k')).toBe('blob:local');
    expect(calls).toHaveLength(0);
    cache.clear();
    expect(released).toEqual(['blob:local']);
    expect(cache.get('k')).toBeUndefined();
  });

  it('releases a seed at once when the image is already known', async () => {
    const { cache, released } = harness();
    await cache.load('s', 'k');
    cache.seed('k', 'blob:late');
    expect(cache.get('k')).toBe('data:k');
    expect(released).toEqual(['blob:late']);
  });

  it('does not store a fetch that resolves after the cache was cleared', async () => {
    const { cache } = harness();
    const loading: Promise<string | null> = cache.load('s', 'k');
    cache.clear();
    expect(await loading).toBe('data:k');
    expect(cache.get('k')).toBeUndefined();
  });
});
