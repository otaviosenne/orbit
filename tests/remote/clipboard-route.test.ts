import { request } from 'node:http';
import type { IncomingHttpHeaders, IncomingMessage, Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MemoryClipboard } from '../../src/demo/demo-clipboard';
import { DemoDictationEngine } from '../../src/demo/demo-dictation';
import { DEMO_ROUTES } from '../../src/demo/demo-routes';
import { generateToken } from '../../src/main/remote/access-token';
import { DeviceSessions, SHORTCUTS_DEVICE_NAME } from '../../src/main/remote/device-sessions';
import { FailureLimiter } from '../../src/main/remote/failure-limiter';
import { LegacySessions } from '../../src/main/remote/legacy-session';
import { PairingCodes } from '../../src/main/remote/pairing-codes';
import { closeServer, createRemoteServer, listenLocally } from '../../src/main/remote/remote-server';
import { trustedOrigins } from '../../src/main/remote/trusted-origins';
import { MAX_SHARED_TEXT_BYTES } from '../../src/main/shared-clipboard/clipboard-limits';
import { encodeWire } from '../../src/shared/wire-codec';

interface Reply {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: string;
}

const TOKEN: string = generateToken();
// High enough that the tests' own wrong tokens never lock the server; the lockout test uses a server of its own.
const GENEROUS_FAILURES: number = 1000;
const CLIPBOARD_PATH: string = '/api/clipboard';
const PHONE_TEXT: string = 'from the iPhone ✓';

let server: Server;
let port: number = 0;
let dir: string;
let devices: DeviceSessions;
let browserCookie: string = '';
let shortcutsToken: string = '';
let notified: number = 0;
const clipboard: MemoryClipboard = new MemoryClipboard();
const logLines: string[] = [];

function call(method: string, path: string, headers: Readonly<Record<string, string>> = {}, body?: string, at: number = port): Promise<Reply> {
  return new Promise((resolve: (reply: Reply) => void, reject: (error: Error) => void): void => {
    const outgoing = request({ host: '127.0.0.1', port: at, method, path, headers: { host: `127.0.0.1:${at}`, ...headers } }, (response: IncomingMessage): void => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer): void => void chunks.push(chunk));
      response.on('end', (): void => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}

function origin(): string {
  return `http://127.0.0.1:${port}`;
}

function bearer(token: string = shortcutsToken): Readonly<Record<string, string>> {
  return { authorization: `Bearer ${token}` };
}

async function mintShortcutsToken(): Promise<Reply> {
  return call('POST', '/api/shortcuts-token', { origin: origin(), cookie: browserCookie });
}

function startServer(limiter: FailureLimiter, portOf: () => number = (): number => port): Server {
  return createRemoteServer({
    routes: DEMO_ROUTES,
    webRoot: dir,
    credentials: () => ({ token: TOKEN, trusted: trustedOrigins(portOf(), ''), devices }),
    limiter,
    pairing: new PairingCodes(),
    legacy: new LegacySessions(),
    dictation: () => new DemoDictationEngine(),
    clipboard,
    notifyPhoneCopy: (): void => void notified++,
    now: (): number => Date.now(),
    log: (line: string): void => void logLines.push(line),
  });
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'orbit-clipboard-'));
  devices = new DeviceSessions(dir);
  server = startServer(new FailureLimiter({ maxFailures: GENEROUS_FAILURES, windowMs: 60_000, lockoutMs: 60_000 }));
  port = await listenLocally(server, 0);
  const signedIn: Reply = await call('POST', '/api/session', { origin: origin(), 'content-type': 'application/json' }, JSON.stringify({ token: TOKEN }));
  browserCookie = signedIn.headers['set-cookie']?.[0]?.split(';')[0] ?? '';
  shortcutsToken = (JSON.parse((await mintShortcutsToken()).body) as { token: string }).token;
});

afterAll(async () => {
  await closeServer(server);
  await devices.flushed();
  await rm(dir, { recursive: true, force: true });
});

beforeEach(() => {
  clipboard.hold({ kind: 'text', text: 'on the PC' });
});

describe('Shortcuts token', () => {
  it('is made only for a signed-in browser, and listed as its own device', async () => {
    expect((await call('POST', '/api/shortcuts-token', { origin: origin() })).status).toBe(401);
    expect(devices.list().filter((device: { name: string }) => device.name === SHORTCUTS_DEVICE_NAME)).toHaveLength(1);
  });

  it('never signs in to the rest of Orbit Web as a cookie', async () => {
    const cookie: string = `orbit_session=${shortcutsToken}`;
    const reply: Reply = await call('POST', '/api/call/GetChats', { origin: origin(), 'content-type': 'application/json', cookie }, encodeWire([]));
    expect(reply.status).toBe(401);
    expect((await call('GET', '/api/session', { cookie })).status).toBe(401);
    expect((await call('POST', '/api/pairing-code', { origin: origin(), cookie })).status).toBe(401);
  });

  it('retires the previous token when a new one is made', async () => {
    const previous: string = shortcutsToken;
    shortcutsToken = (JSON.parse((await mintShortcutsToken()).body) as { token: string }).token;
    expect((await call('GET', CLIPBOARD_PATH, bearer(previous))).status).toBe(401);
    expect((await call('GET', CLIPBOARD_PATH, bearer())).status).toBe(200);
    expect(devices.list().filter((device: { name: string }) => device.name === SHORTCUTS_DEVICE_NAME)).toHaveLength(1);
  });
});

describe('GET /api/clipboard', () => {
  it('sends the PC clipboard as plain text, uncached, with no Origin', async () => {
    const reply: Reply = await call('GET', CLIPBOARD_PATH, bearer());
    expect(reply.status).toBe(200);
    expect(reply.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.body).toBe('on the PC');
  });

  it('refuses without the Shortcuts token, including a browser cookie or the access token', async () => {
    const browserSecret: string = browserCookie.slice('orbit_session='.length);
    for (const headers of [{}, bearer('forged.value'), bearer(browserSecret), bearer(TOKEN), { cookie: browserCookie }]) {
      const reply: Reply = await call('GET', CLIPBOARD_PATH, headers);
      expect(reply.status, JSON.stringify(Object.keys(headers))).toBe(401);
      expect(reply.body).not.toContain('on the PC');
    }
  });

  it('never hands over an Orbit secret', async () => {
    clipboard.hold({ kind: 'secret' });
    const reply: Reply = await call('GET', CLIPBOARD_PATH, bearer());
    expect(reply.status).toBe(403);
    expect(reply.body).toContain('Orbit secret');
  });

  it('answers empty for an empty clipboard and refuses an image or a huge copy', async () => {
    clipboard.hold({ kind: 'empty' });
    expect((await call('GET', CLIPBOARD_PATH, bearer())).status).toBe(204);
    clipboard.hold({ kind: 'not-text' });
    expect((await call('GET', CLIPBOARD_PATH, bearer())).status).toBe(415);
    clipboard.hold({ kind: 'too-large' });
    expect((await call('GET', CLIPBOARD_PATH, bearer())).status).toBe(413);
  });

  it('refuses a request from another site even with the token', async () => {
    expect((await call('GET', CLIPBOARD_PATH, { ...bearer(), origin: 'https://evil.example' })).status).toBe(403);
  });
});

describe('POST /api/clipboard', () => {
  it('takes a plain-text body with no Origin, puts it on the PC clipboard and announces it', async () => {
    const before: number = notified;
    const reply: Reply = await call('POST', CLIPBOARD_PATH, { ...bearer(), 'content-type': 'text/plain; charset=utf-8' }, PHONE_TEXT);
    expect(reply.status).toBe(200);
    expect(await clipboard.read()).toEqual({ kind: 'text', text: PHONE_TEXT });
    expect(notified).toBe(before + 1);
  });

  it('takes JSON {text}, a form field, or a body with no type', async () => {
    const bodies: readonly [Readonly<Record<string, string>>, string][] = [
      [{ 'content-type': 'application/json' }, JSON.stringify({ text: 'json' })],
      [{ 'content-type': 'application/x-www-form-urlencoded' }, new URLSearchParams({ text: 'form' }).toString()],
      [{}, 'bare'],
    ];
    for (const [headers, body] of bodies) {
      expect((await call('POST', CLIPBOARD_PATH, { ...bearer(), ...headers }, body)).status).toBe(200);
    }
    expect(await clipboard.read()).toEqual({ kind: 'text', text: 'bare' });
  });

  it('leaves the clipboard alone for a wrong token, an empty or unusable body, or one over the limit', async () => {
    const before: number = notified;
    expect((await call('POST', CLIPBOARD_PATH, bearer('forged.value'), 'nope')).status).toBe(401);
    expect((await call('POST', CLIPBOARD_PATH, bearer(), '')).status).toBe(400);
    expect((await call('POST', CLIPBOARD_PATH, { ...bearer(), 'content-type': 'application/json' }, '{"other":1}')).status).toBe(400);
    expect((await call('POST', CLIPBOARD_PATH, { ...bearer(), 'content-type': 'image/png' }, 'png')).status).toBe(415);
    const huge: string = 'x'.repeat(MAX_SHARED_TEXT_BYTES + 1);
    expect([413, 0]).toContain((await call('POST', CLIPBOARD_PATH, bearer(), huge).catch((): Reply => ({ status: 0, headers: {}, body: '' }))).status);
    expect(await clipboard.read()).toEqual({ kind: 'text', text: 'on the PC' });
    expect(notified).toBe(before);
  });

  it('never logs the text or the token', () => {
    const log: string = logLines.join('\n');
    expect(log).not.toContain(PHONE_TEXT);
    expect(log).not.toContain(shortcutsToken);
  });
});

describe('Wrong Shortcuts tokens', () => {
  it('lock the clipboard like failed sign-ins do', async () => {
    const maxFailures: number = 2;
    let lockedPort: number = 0;
    const locked: Server = startServer(new FailureLimiter({ maxFailures, windowMs: 60_000, lockoutMs: 60_000 }), (): number => lockedPort);
    lockedPort = await listenLocally(locked, 0);
    try {
      for (let attempt: number = 0; attempt < maxFailures; attempt++) await call('GET', CLIPBOARD_PATH, bearer('forged.value'), undefined, lockedPort);
      const reply: Reply = await call('GET', CLIPBOARD_PATH, bearer(), undefined, lockedPort);
      expect(reply.status).toBe(429);
      expect(reply.headers['retry-after']).toBeDefined();
    } finally {
      await closeServer(locked);
    }
  });
});
