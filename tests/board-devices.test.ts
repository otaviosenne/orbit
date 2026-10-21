import { describe, expect, it } from 'vitest';
import { BoardDevices, sameDevices } from '../src/renderer/board/board-devices';
import type { ChatDevices } from '../src/shared/types';

const NONE: ChatDevices = { emulator: null, browser: null };
const PIXEL: ChatDevices = { emulator: { label: 'Pixel_6a_2:5558' }, browser: null };
const CHECKOUT: ChatDevices = { emulator: null, browser: { title: 'Checkout', url: 'http://localhost:5173/checkout' } };
// Past the store's pause between two questions about the same chat.
const LATER_MS: number = 10_000;

interface Harness {
  readonly store: BoardDevices;
  readonly asked: string[];
  readonly redraws: () => number;
  answers: Map<string, ChatDevices>;
}

function harness(answers: Map<string, ChatDevices>): Harness {
  const asked: string[] = [];
  let redraws: number = 0;
  const state: Harness = {
    asked,
    answers,
    redraws: (): number => redraws,
    store: new BoardDevices(
      async (sessionId: string): Promise<ChatDevices> => {
        asked.push(sessionId);
        return state.answers.get(sessionId) ?? NONE;
      },
      (): void => void (redraws += 1),
    ),
  };
  return state;
}

describe('BoardDevices', () => {
  it('answers each chat and redraws once per round', async () => {
    const h: Harness = harness(new Map([['a', PIXEL], ['b', CHECKOUT]]));
    await h.store.follow(['a', 'b', 'c'], 0);
    expect(h.store.devicesOf('a')).toEqual(PIXEL);
    expect(h.store.devicesOf('b')).toEqual(CHECKOUT);
    expect(h.store.devicesOf('c')).toEqual(NONE);
    expect(h.redraws()).toBe(1);
  });

  it('does not ask again before the pause is over, and does not redraw when nothing changed', async () => {
    const h: Harness = harness(new Map([['a', PIXEL]]));
    await h.store.follow(['a'], 0);
    await h.store.follow(['a'], 1);
    expect(h.asked).toEqual(['a']);
    await h.store.follow(['a'], LATER_MS);
    expect(h.asked).toEqual(['a', 'a']);
    expect(h.redraws()).toBe(1);
  });

  it('redraws when a device closes', async () => {
    const h: Harness = harness(new Map([['a', PIXEL]]));
    await h.store.follow(['a'], 0);
    h.answers = new Map();
    await h.store.follow(['a'], LATER_MS);
    expect(h.store.devicesOf('a')).toEqual(NONE);
    expect(h.redraws()).toBe(2);
  });

  it('forgets chats that left the board, even when their answer arrives late', async () => {
    let release: (devices: ChatDevices) => void = (): void => undefined;
    const store: BoardDevices = new BoardDevices(
      (): Promise<ChatDevices> => new Promise((resolve): void => void (release = resolve)),
      (): void => undefined,
    );
    const asking: Promise<void> = store.follow(['a'], 0);
    await store.follow([], 1);
    release(PIXEL);
    await asking;
    expect(store.devicesOf('a')).toEqual(NONE);
  });

  it('does not ask about a chat whose question is still on its way', async () => {
    let calls: number = 0;
    const store: BoardDevices = new BoardDevices(
      (): Promise<ChatDevices> => {
        calls += 1;
        return new Promise((): void => undefined);
      },
      (): void => undefined,
    );
    void store.follow(['a'], 0);
    void store.follow(['a'], LATER_MS);
    void store.recheck('a', LATER_MS);
    expect(calls).toBe(1);
  });

  it('rechecks at once after a failed focus, without waiting out the pause', async () => {
    const h: Harness = harness(new Map([['a', PIXEL]]));
    await h.store.follow(['a'], 0);
    h.answers = new Map();
    await h.store.recheck('a', 1);
    expect(h.store.devicesOf('a')).toEqual(NONE);
  });

  it('treats a failed question as no devices', async () => {
    const store: BoardDevices = new BoardDevices((): Promise<ChatDevices> => Promise.reject(new Error('gone')), (): void => undefined);
    await store.follow(['a'], 0);
    expect(store.devicesOf('a')).toEqual(NONE);
  });
});

describe('sameDevices', () => {
  it('compares the emulator label and the browser title and URL', () => {
    expect(sameDevices(PIXEL, { emulator: { label: 'Pixel_6a_2:5558' }, browser: null })).toBe(true);
    expect(sameDevices(PIXEL, { emulator: { label: 'Pixel_6a:5554' }, browser: null })).toBe(false);
    expect(sameDevices(CHECKOUT, { emulator: null, browser: { title: 'Checkout', url: 'http://localhost:5173/' } })).toBe(false);
    expect(sameDevices(NONE, { emulator: null, browser: { title: null, url: null } })).toBe(false);
  });
});
