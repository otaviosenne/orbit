import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DemoDictationEngine } from '../../src/demo/demo-dictation';
import { DEMO_ROUTES } from '../../src/demo/demo-routes';
import { DeviceSessions } from '../../src/main/remote/device-sessions';
import { RemoteConfigStore } from '../../src/main/remote/remote-config';
import { RemoteController } from '../../src/main/remote/remote-controller';
import type { RemoteSettings } from '../../src/shared/remote-settings';

// Above the default, away from a running Orbit; the controller binds the configured port itself.
const TEST_PORT: number = 4598;

describe('RemoteController', () => {
  let dir: string;
  let controller: RemoteController;
  let devices: DeviceSessions;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'orbit-controller-'));
    const store: RemoteConfigStore = new RemoteConfigStore(dir);
    await store.save({ enabled: false, port: TEST_PORT, externalUrl: '', token: '' });
    devices = new DeviceSessions(dir);
    controller = new RemoteController({ store, devices, routes: DEMO_ROUTES, webRoot: dir, dictation: () => new DemoDictationEngine(), log: (): void => undefined });
    await controller.start();
  });

  afterEach(async () => {
    await controller.stop();
    await devices.flushed();
    await rm(dir, { recursive: true, force: true });
  });

  it('creates the token on first enable and offers no pairing link without an external URL', async () => {
    const settings: RemoteSettings = await controller.setEnabled(true);
    expect(settings.running).toBe(true);
    expect(settings.token.length).toBeGreaterThan(0);
    expect(settings.pairingUrl).toBeNull();
    const paired: RemoteSettings = await controller.setExternalUrl('https://orbit.example.com/x');
    expect(paired.pairingUrl).toBe(`https://orbit.example.com/#token=${paired.token}`);
    expect(paired.pairingQrSvg).toContain('<svg');
  });

  it('is never left listening after a quick on then off', async () => {
    const turningOn: Promise<RemoteSettings> = controller.setEnabled(true);
    const off: RemoteSettings = await controller.setEnabled(false);
    await turningOn;
    expect(off.enabled).toBe(false);
    expect(controller.settings().running).toBe(false);
  });

  it('lists devices, signs one or all out, and keeps them through a new token', async () => {
    await controller.setEnabled(true);
    const phone: string = devices.create('Chrome on Android', 1).device.id;
    devices.create('Safari on iPhone', 2);
    const rotated: RemoteSettings = await controller.regenerateToken();
    expect(rotated.devices.map((device: { name: string }) => device.name)).toEqual(['Safari on iPhone', 'Chrome on Android']);
    const revoked: RemoteSettings = await controller.revokeDevice(phone);
    expect(revoked.devices.map((device: { name: string }) => device.name)).toEqual(['Safari on iPhone']);
    expect((await controller.signOutAllDevices()).devices).toEqual([]);
  });

  it('refuses an external URL that is not a web address', async () => {
    expect((await controller.setExternalUrl('javascript:alert(1)')).error).not.toBeNull();
  });
});
