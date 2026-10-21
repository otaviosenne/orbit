import { beforeEach, describe, expect, it } from 'vitest';
import { PinnedChats } from '../src/renderer/board/pinned-chats';

describe('PinnedChats', () => {
  let stored: string | null;

  beforeEach(() => {
    stored = null;
    globalThis.localStorage = {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    } as unknown as Storage;
  });

  it('keeps pins in the order they were made and remembers them', () => {
    const pins: PinnedChats = new PinnedChats();
    pins.toggle('b');
    pins.toggle('a');
    expect(pins.order).toEqual(['b', 'a']);
    expect(new PinnedChats().has('a')).toBe(true);
  });

  it('unpins a pinned chat', () => {
    const pins: PinnedChats = new PinnedChats();
    pins.toggle('a');
    pins.toggle('a');
    expect(pins.has('a')).toBe(false);
  });

  it('pins and unpins only once, whatever order the drops come in', () => {
    const pins: PinnedChats = new PinnedChats();
    pins.pin('a');
    pins.pin('b');
    pins.pin('a');
    expect(pins.order).toEqual(['a', 'b']);
    pins.unpin('a');
    pins.unpin('a');
    expect(pins.order).toEqual(['b']);
    expect(new PinnedChats().order).toEqual(['b']);
  });
});
