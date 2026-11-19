import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClipboardCommands } from '../src/main/secret-clipboard/secret-clipboard';
import { CLEAR_SECRET_AFTER_MS, clearIfStillThere, copySecret } from '../src/main/secret-clipboard/secret-clipboard';

// A clipboard in memory: write puts the text there, clear empties it.
function fakeClipboard(): ClipboardCommands & { held: string | null } {
  const clipboard = {
    held: null as string | null,
    write: async (text: string): Promise<void> => { clipboard.held = text; },
    read: async (): Promise<string | null> => clipboard.held,
    clear: async (): Promise<void> => { clipboard.held = null; },
  };
  return clipboard;
}

describe('copySecret', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('wipes its secret once the timeout passes', async () => {
    const clipboard = fakeClipboard();
    await copySecret('hunter2', clipboard);
    expect(clipboard.held).toBe('hunter2');
    await vi.advanceTimersByTimeAsync(CLEAR_SECRET_AFTER_MS);
    expect(clipboard.held).toBeNull();
  });

  it('leaves a later copy alone when the earlier one times out', async () => {
    const clipboard = fakeClipboard();
    const gap: number = CLEAR_SECRET_AFTER_MS / 2;
    await copySecret('first', clipboard);
    await vi.advanceTimersByTimeAsync(gap);
    await copySecret('second', clipboard);
    await vi.advanceTimersByTimeAsync(gap);
    expect(clipboard.held).toBe('second');
    await vi.advanceTimersByTimeAsync(gap);
    expect(clipboard.held).toBeNull();
  });
});

describe('clearIfStillThere', () => {
  it('keeps whatever the user copied since', async () => {
    const clipboard = fakeClipboard();
    clipboard.held = 'something else';
    await clearIfStillThere('hunter2', clipboard);
    expect(clipboard.held).toBe('something else');
  });

  it('swallows a clipboard that cannot be read', async () => {
    const clipboard: ClipboardCommands = { ...fakeClipboard(), read: (): Promise<string | null> => Promise.reject(new Error('no wayland')) };
    await expect(clearIfStillThere('hunter2', clipboard)).resolves.toBeUndefined();
  });
});
