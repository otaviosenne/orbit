import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateToken } from '../../src/main/remote/access-token';
import { DEFAULT_REMOTE_CONFIG, DEFAULT_REMOTE_PORT, parseRemoteConfig, RemoteConfigStore, remoteConfigDir } from '../../src/main/remote/remote-config';

const OWNER_ONLY: number = 0o600;
const OWNER_ONLY_FOLDER: number = 0o700;
const PERMISSION_BITS: number = 0o777;

describe('remote config', () => {
  let dir: string | null = null;

  afterEach(async () => {
    if (dir !== null) await rm(dir, { recursive: true, force: true });
    dir = null;
  });

  it('falls back field by field on a broken file', () => {
    expect(parseRemoteConfig(null)).toEqual(DEFAULT_REMOTE_CONFIG);
    expect(parseRemoteConfig({ enabled: 'yes', port: 80, externalUrl: 'ftp://x', token: 'short' })).toEqual(DEFAULT_REMOTE_CONFIG);
    expect(parseRemoteConfig({ port: 4599 }).port).toBe(4599);
  });

  it('saves the token readable by its owner only, even over a looser existing file', async () => {
    dir = await mkdtemp(join(tmpdir(), 'orbit-remote-'));
    const store: RemoteConfigStore = new RemoteConfigStore(dir);
    await writeFile(join(dir, 'remote.json'), '{}', { mode: 0o644 });
    const token: string = generateToken();
    await store.save({ enabled: true, port: DEFAULT_REMOTE_PORT, externalUrl: 'https://orbit.example.com', token });
    expect((await stat(join(dir, 'remote.json'))).mode & PERMISSION_BITS).toBe(OWNER_ONLY);
    expect((await stat(dir)).mode & PERMISSION_BITS).toBe(OWNER_ONLY_FOLDER);
    expect((await store.load()).token).toBe(token);
  });

  it('can be pointed elsewhere for tests and keeps the demo out of the real folder', () => {
    expect(remoteConfigDir({ ORBIT_REMOTE_CONFIG_DIR: '/tmp/x' }, '/home/u', null)).toBe('/tmp/x');
    expect(remoteConfigDir({}, '/home/u', '/home/u/.config/orbit-demo')).toBe('/home/u/.config/orbit-demo/remote');
    expect(remoteConfigDir({}, '/home/u', null)).toBe('/home/u/.config/orbit');
  });
});
