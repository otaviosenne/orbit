import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceRecheck } from '../src/renderer/board/card-devices';
import { openCardDevice } from '../src/renderer/board/card-devices';
import type { DeviceFocus } from '../src/shared/types';

describe('openCardDevice', () => {
  let outcome: DeviceFocus;
  let focused: string[];
  let rechecked: string[];
  const devices: DeviceRecheck = {
    recheck: async (sessionId: string): Promise<void> => void rechecked.push(sessionId),
  };

  beforeEach(() => {
    outcome = 'exact';
    focused = [];
    rechecked = [];
    vi.spyOn(console, 'warn').mockImplementation((): void => undefined);
    vi.stubGlobal('window', {
      radar: {
        focusChatEmulator: async (sessionId: string): Promise<DeviceFocus> => (focused.push(`emulator:${sessionId}`), outcome),
        focusChatBrowser: async (sessionId: string): Promise<DeviceFocus> => (focused.push(`browser:${sessionId}`), outcome),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('focuses the device the icon stands for', async () => {
    await openCardDevice('emulator', 'a', devices);
    await openCardDevice('browser', 'b', devices);
    expect(focused).toEqual(['emulator:a', 'browser:b']);
    expect(rechecked).toEqual([]);
  });

  it('keeps the icon when only the browser window could be brought forward', async () => {
    outcome = 'window';
    await openCardDevice('browser', 'a', devices);
    expect(rechecked).toEqual([]);
  });

  it('asks again about a device that has closed, so its icon goes away', async () => {
    outcome = 'missing';
    await openCardDevice('emulator', 'a', devices);
    expect(rechecked).toEqual(['a']);
  });
});
