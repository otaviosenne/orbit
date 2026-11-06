import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deviceNameFrom } from '../../src/main/remote/device-name';
import { DeviceSessions, MAX_DEVICES } from '../../src/main/remote/device-sessions';

const PRIVATE_FILE_MODE: number = 0o600;
const PERMISSION_BITS: number = 0o777;

describe('DeviceSessions', () => {
  let dir: string;
  let sessions: DeviceSessions;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'orbit-devices-'));
    sessions = new DeviceSessions(dir);
  });

  afterEach(async () => {
    await sessions.flushed();
    await rm(dir, { recursive: true, force: true });
  });

  it('signs a cookie in as its device and marks it seen', () => {
    const { device, cookieValue } = sessions.create('Chrome on Android', 100);
    expect(sessions.verify(cookieValue, 500)).toEqual({ ...device, lastSeenAt: 500 });
    expect(sessions.list()[0]?.lastSeenAt).toBe(500);
  });

  it('refuses a forged secret, an unknown id and a revoked device', () => {
    const { device, cookieValue } = sessions.create('Phone', 1);
    const [id] = cookieValue.split('.');
    expect(sessions.verify(`${id}.forged`, 2)).toBeNull();
    expect(sessions.verify('nope.secret', 2)).toBeNull();
    expect(sessions.verify('no-separator', 2)).toBeNull();
    expect(sessions.revoke(device.id, 3)).toBe(true);
    expect(sessions.verify(cookieValue, 4)).toBeNull();
  });

  it('keeps only hashes on disk, readable by the owner alone, and reads them back', async () => {
    const { cookieValue } = sessions.create('Phone', 1);
    await sessions.flushed();
    const path: string = join(dir, 'devices.json');
    const text: string = await readFile(path, 'utf8');
    expect(text).not.toContain(cookieValue.split('.')[1]);
    expect((await stat(path)).mode & PERMISSION_BITS).toBe(PRIVATE_FILE_MODE);
    const reloaded: DeviceSessions = new DeviceSessions(dir);
    await reloaded.load();
    expect(reloaded.verify(cookieValue, 2)?.name).toBe('Phone');
  });

  it('drops the device unseen the longest past the cap, and signs every one out at once', () => {
    const first: string = sessions.create('First', 0).cookieValue;
    for (let index: number = 1; index <= MAX_DEVICES; index += 1) sessions.create(`Device ${index}`, index);
    expect(sessions.list()).toHaveLength(MAX_DEVICES);
    expect(sessions.verify(first, MAX_DEVICES + 1)).toBeNull();
    sessions.revokeAll(MAX_DEVICES + 2);
    expect(sessions.list()).toEqual([]);
  });
});

describe('deviceNameFrom', () => {
  it('names the browser and the system', () => {
    expect(deviceNameFrom('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari on iPhone');
    expect(deviceNameFrom('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36')).toBe('Chrome on Android');
    expect(deviceNameFrom('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0')).toBe('Edge on Linux');
    expect(deviceNameFrom('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0')).toBe('Firefox on Windows');
    expect(deviceNameFrom(undefined)).toBe('Unknown browser');
    expect(deviceNameFrom('curl/8.0')).toBe('Unknown browser');
  });
});
