import { describe, expect, it } from 'vitest';
import type { DesktopWindow } from '../src/core/devices/desktop-window';
import { EmulatorCloser } from '../src/main/devices/emulator-closer';

function window(address: string, className: string, title: string): DesktopWindow {
  return { address, pid: 1, className, title, focusHistoryId: 0, startedAt: null };
}

const WINDOWS: DesktopWindow[] = [
  window('0xa', 'Emulator', 'Android Emulator - Pixel_6a:5554'),
  window('0xb', 'Emulator', 'Emulator'),
  window('0xc', 'Emulator', 'Android Emulator - Pixel_8:5556'),
  window('0xd', 'kitty', 'Android Emulator - fake:5558'),
];

describe('EmulatorCloser', () => {
  it('lists only the emulators, by their window titles', async () => {
    const closer: EmulatorCloser = new EmulatorCloser({ fresh: () => Promise.resolve(WINDOWS) }, () => Promise.resolve(''));
    expect(await closer.labels()).toEqual(['Pixel_6a:5554', 'Pixel_8:5556']);
  });

  it('kills each one through adb on its console port', async () => {
    const calls: string[][] = [];
    const closer: EmulatorCloser = new EmulatorCloser({ fresh: () => Promise.resolve(WINDOWS) }, (command, args) => (calls.push([command, ...args]), Promise.resolve('')));
    expect(await closer.closeAll()).toBe(2);
    expect(calls.map((call) => call.slice(1))).toEqual([['-s', 'emulator-5554', 'emu', 'kill'], ['-s', 'emulator-5556', 'emu', 'kill']]);
    expect(calls[0]?.[0]).toMatch(/platform-tools\/adb$/);
  });

  it('closes the window when adb cannot reach the emulator, and counts only the ones that went', async () => {
    const closer: EmulatorCloser = new EmulatorCloser({ fresh: () => Promise.resolve(WINDOWS) }, (command, args) => {
      if (command !== 'hyprctl') return Promise.reject(new Error('adb: not found'));
      return args.includes('address:0xc') ? Promise.reject(new Error('gone')) : Promise.resolve('');
    });
    expect(await closer.closeAll()).toBe(1);
  });
});
