import { request } from 'node:http';
import type { IncomingHttpHeaders, IncomingMessage, Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateToken } from '../../src/main/remote/access-token';
import { FailureLimiter } from '../../src/main/remote/failure-limiter';
import type { RemoteRoutes } from '../../src/main/remote/remote-context';
import { closeServer, createRemoteServer, listenLocally } from '../../src/main/remote/remote-server';
import { trustedOrigins } from '../../src/main/remote/trusted-origins';
import { DemoDictationEngine } from '../../src/demo/demo-dictation';
import { DEMO_ROUTES } from '../../src/demo/demo-routes';
import type { ChatSnapshot } from '../../src/shared/types';
import { decodeWire, encodeWire } from '../../src/shared/wire-codec';

interface Reply {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly body: string;
}

interface Call {
  readonly method: string;
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

const TOKEN: string = generateToken();
const LOCKOUT_FAILURES: number = 3;
const sentMessages: unknown[][] = [];
const logLines: string[] = [];
// The demo's answers, except that a sent message is recorded so the test can see what arrived.
const ROUTES: RemoteRoutes = { ...DEMO_ROUTES, SendMessage: (...args: unknown[]): unknown => (sentMessages.push(args), DEMO_ROUTES.SendMessage(...args)) };

let server: Server;
let port: number = 0;
let webRoot: string;
let cookie: string = '';

function call({ method, path, headers = {}, body }: Call): Promise<Reply> {
  return new Promise((resolve: (reply: Reply) => void, reject: (error: Error) => void): void => {
    const outgoing = request({ host: '127.0.0.1', port, method, path, headers: { host: `127.0.0.1:${port}`, ...headers } }, (response: IncomingMessage): void => {
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

function signIn(token: string): Promise<Reply> {
  return call({ method: 'POST', path: '/api/session', headers: { origin: origin(), 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
}

function apiCall(channel: string, args: unknown[], headers: Readonly<Record<string, string>> = {}): Promise<Reply> {
  return call({
    method: 'POST',
    path: `/api/call/${channel}`,
    headers: { origin: origin(), 'content-type': 'application/json', cookie, ...headers },
    body: encodeWire(args),
  });
}

beforeAll(async () => {
  webRoot = await mkdtemp(join(tmpdir(), 'orbit-web-root-'));
  await writeFile(join(webRoot, 'index.html'), '<!doctype html><title>Orbit</title>');
  server = createRemoteServer({
    routes: ROUTES,
    webRoot,
    credentials: () => ({ token: TOKEN, trusted: trustedOrigins(port, '') }),
    limiter: new FailureLimiter({ maxFailures: LOCKOUT_FAILURES, windowMs: 60_000, lockoutMs: 60_000 }),
    dictation: () => new DemoDictationEngine(),
    now: (): number => Date.now(),
    log: (line: string): void => void logLines.push(line),
  });
  port = await listenLocally(server, 0);
});

afterAll(async () => {
  await closeServer(server);
  await rm(webRoot, { recursive: true, force: true });
});

describe('Orbit Web server', () => {
  it('serves the app shell with headers that forbid framing and sniffing', async () => {
    const reply: Reply = await call({ method: 'GET', path: '/' });
    expect(reply.status).toBe(200);
    expect(reply.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(reply.headers['x-frame-options']).toBe('DENY');
    expect(reply.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('never leaves its folder', async () => {
    for (const path of ['/../package.json', '/%2e%2e/%2e%2e/etc/passwd', '/..%2fpackage.json']) {
      expect((await call({ method: 'GET', path })).status, path).toBe(404);
    }
  });

  it('refuses a host name it does not own (DNS rebinding)', async () => {
    expect((await call({ method: 'GET', path: '/', headers: { host: `rebind.example:${port}` } })).status).toBe(421);
  });

  it('refuses API calls before sign-in', async () => {
    expect((await apiCall('GetChats', [], { cookie: '' })).status).toBe(401);
    expect((await apiCall('GetChats', [], { cookie: 'orbit_session=forged' })).status).toBe(401);
    expect((await call({ method: 'GET', path: '/api/session' })).status).toBe(401);
  });

  it('refuses a sign-in without an Origin or from another site', async () => {
    const json: Readonly<Record<string, string>> = { 'content-type': 'application/json' };
    const body: string = JSON.stringify({ token: TOKEN });
    expect((await call({ method: 'POST', path: '/api/session', headers: json, body })).status).toBe(403);
    expect((await call({ method: 'POST', path: '/api/session', headers: { ...json, origin: 'https://evil.example' }, body })).status).toBe(403);
  });

  it('trades the right token for a strict session cookie', async () => {
    expect((await signIn('wrong')).status).toBe(401);
    const reply: Reply = await signIn(TOKEN);
    expect(reply.status).toBe(204);
    const setCookie: string = reply.headers['set-cookie']?.[0] ?? '';
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict']) expect(setCookie).toContain(attribute);
    expect(setCookie).not.toContain(TOKEN);
    cookie = setCookie.split(';')[0] ?? '';
    expect((await call({ method: 'GET', path: '/api/session', headers: { cookie } })).status).toBe(204);
  });

  it('answers a signed-in call with the route’s result', async () => {
    const reply: Reply = await apiCall('GetChats', []);
    expect(reply.status).toBe(200);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect((decodeWire(reply.body) as ChatSnapshot[]).length).toBeGreaterThan(0);
  });

  it('refuses a signed-in call from another origin, or without JSON', async () => {
    expect((await apiCall('GetChats', [], { origin: 'https://evil.example' })).status).toBe(403);
    expect((await apiCall('GetChats', [], { 'content-type': 'text/plain' })).status).toBe(415);
  });

  it('hides desktop-only and unknown channels', async () => {
    for (const channel of ['AddShortcut', 'ChooseFolder', 'GetRemoteSettings', 'RegenerateRemoteToken', 'constructor', 'Nope']) {
      expect((await apiCall(channel, [])).status, channel).toBe(404);
    }
  });

  it('acts only on chats that are open right now', async () => {
    expect((await apiCall('SendMessage', [1, 'hi', []])).status).toBe(403);
    expect((await apiCall('CloseChat', [1])).status).toBe(403);
    const chats: ChatSnapshot[] = decodeWire((await apiCall('GetChats', [])).body) as ChatSnapshot[];
    const pid: number = chats[0]?.pid ?? 0;
    const bytes: Uint8Array = new Uint8Array([137, 80, 78, 71]);
    const reply: Reply = await apiCall('SendMessage', [pid, 'hi', [{ name: 'a.png', mediaType: 'image/png', bytes }]]);
    expect(reply.status).toBe(200);
    const received: unknown = (sentMessages.at(-1)?.[2] as { bytes: unknown }[] | undefined)?.[0]?.bytes;
    expect(received).toEqual(bytes);
  });

  it('rejects malformed arguments', async () => {
    const reply: Reply = await call({
      method: 'POST',
      path: '/api/call/GetChats',
      headers: { origin: origin(), 'content-type': 'application/json', cookie },
      body: '{"not":"an array"}',
    });
    expect(reply.status).toBe(400);
  });

  it('logs method, path, status and time, never the token', () => {
    expect(logLines.some((line: string) => / POST \/api\/call\/GetChats 200 \d+ms$/.test(line))).toBe(true);
    expect(logLines.join('\n')).not.toContain(TOKEN);
  });

  it('locks sign-in after repeated failures, even for the right token', async () => {
    for (let attempt: number = 0; attempt < LOCKOUT_FAILURES; attempt += 1) await signIn('wrong');
    const reply: Reply = await signIn(TOKEN);
    expect(reply.status).toBe(429);
    expect(Number(reply.headers['retry-after'])).toBeGreaterThan(0);
  });
});
