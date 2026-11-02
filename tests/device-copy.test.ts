import { describe, expect, it } from 'vitest';
import { deviceCopy } from '../src/renderer/board/device-copy';
import type { DeviceCopy } from '../src/renderer/board/device-copy';
import type { ChatDevices } from '../src/shared/types';

const PIXEL: ChatDevices['emulator'] = { label: 'Pixel_8:5554', metroPort: 8081, publicUrl: 'https://8081.example.com' };

describe('device copy on Orbit Web', () => {
  it('copies the Metro tunnel address for the emulator', () => {
    const copy: DeviceCopy = deviceCopy('emulator', { emulator: PIXEL, browser: null });
    expect(copy.text).toBe('https://8081.example.com');
    expect(copy.toast.preview).toBe('https://8081.example.com');
  });

  it('copies nothing for an emulator whose Metro is missing or unpublished, and says which', () => {
    expect(deviceCopy('emulator', { emulator: { ...PIXEL, metroPort: null, publicUrl: null }, browser: null }).text).toBeNull();
    const unpublished: DeviceCopy = deviceCopy('emulator', { emulator: { ...PIXEL, metroPort: 8090, publicUrl: null }, browser: null });
    expect(unpublished.text).toBeNull();
    expect(unpublished.toast.title).toContain('8090');
  });

  it('copies the tab\'s public address, or its local one with a note when the port is not published', () => {
    const published: DeviceCopy = deviceCopy('browser', { emulator: null, browser: { title: 'Shop', url: 'http://localhost:3000/', publicUrl: 'https://3000.example.com/' } });
    expect(published.text).toBe('https://3000.example.com/');
    const local: DeviceCopy = deviceCopy('browser', { emulator: null, browser: { title: 'Shop', url: 'http://localhost:5173/', publicUrl: null } });
    expect(local.text).toBe('http://localhost:5173/');
    expect(local.toast.note).toBeDefined();
  });

  it('copies nothing for a device that is gone', () => {
    expect(deviceCopy('browser', { emulator: PIXEL, browser: null }).text).toBeNull();
  });
});
