import type { IncomingMessage, Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { DEMO_ROUTES } from '../../src/demo/demo-routes';
import { generateToken, sessionValueFor } from '../../src/main/remote/access-token';
import { contentSecurityPolicy } from '../../src/main/remote/content-security';
import { DICTATION_LIMITS } from '../../src/main/remote/dictation/dictation-limits';
import { CLOSE_POLICY_VIOLATION, CLOSE_UNSUPPORTED_DATA } from '../../src/main/remote/dictation/close-codes';
import { FailureLimiter, SIGN_IN_POLICY } from '../../src/main/remote/failure-limiter';
import { closeServer, createRemoteServer, listenLocally } from '../../src/main/remote/remote-server';
import { trustedOrigins } from '../../src/main/remote/trusted-origins';
import { encodeAudioFrame } from '../../src/shared/dictation-audio-frame';
import type { DictationReply } from '../../src/shared/dictation-protocol';
import { parseDictationReply } from '../../src/shared/dictation-protocol';
import { FINAL_TEXT, HEARD_TEXT, RecordingEngine } from '../support/recording-engine';

type Handshake = { readonly socket: WebSocket } | { readonly status: number };

const CHUNK: Uint8Array = new Uint8Array(320);
const engines: RecordingEngine[] = [];
const logLines: string[] = [];
let token: string = generateToken();
let server: Server;
let port: number = 0;

function origin(): string {
  return `http://127.0.0.1:${port}`;
}

function cookieFor(value: string): string {
  return `orbit_session=${sessionValueFor(value)}`;
}

function handshake(headers: Readonly<Record<string, string>>, path: string = '/api/dictation'): Promise<Handshake> {
  return new Promise((resolve: (result: Handshake) => void): void => {
    const socket: WebSocket = new WebSocket(`ws://127.0.0.1:${port}${path}`, { headers });
    socket.once('open', (): void => resolve({ socket }));
    socket.once('unexpected-response', (_request: unknown, response: IncomingMessage): void => resolve({ status: response.statusCode ?? 0 }));
    socket.once('error', (): void => undefined);
  });
}

async function signedInSocket(): Promise<WebSocket> {
  const result: Handshake = await handshake({ origin: origin(), cookie: cookieFor(token) });
  if (!('socket' in result)) throw new Error(`refused with ${result.status}`);
  return result.socket;
}

function nextReplies(socket: WebSocket, count: number): Promise<DictationReply[]> {
  return new Promise((resolve: (replies: DictationReply[]) => void): void => {
    const replies: DictationReply[] = [];
    const take = (data: WebSocket.RawData): void => {
      const reply: DictationReply | null = parseDictationReply(data.toString());
      if (reply !== null) replies.push(reply);
      if (replies.length < count) return;
      socket.off('message', take);
      resolve(replies);
    };
    socket.on('message', take);
  });
}

function closeCode(socket: WebSocket): Promise<number> {
  return new Promise((resolve: (code: number) => void): void => void socket.once('close', (code: number): void => resolve(code)));
}

async function closeAll(sockets: readonly WebSocket[]): Promise<void> {
  await Promise.all(sockets.map((socket: WebSocket) => {
    const closed: Promise<number> = closeCode(socket);
    socket.close();
    return closed;
  }));
}

beforeAll(async () => {
  server = createRemoteServer({
    routes: DEMO_ROUTES,
    webRoot: '/nonexistent',
    credentials: () => ({ token, trusted: trustedOrigins(port, '') }),
    limiter: new FailureLimiter(SIGN_IN_POLICY),
    dictation: (): RecordingEngine => {
      const engine: RecordingEngine = new RecordingEngine();
      engines.push(engine);
      return engine;
    },
    now: (): number => Date.now(),
    log: (line: string): void => void logLines.push(line),
  });
  port = await listenLocally(server, 0);
});

afterAll(async () => {
  await closeServer(server);
});

describe('Orbit Web dictation socket', () => {
  it('refuses a handshake that would not pass as an API call', async () => {
    const signedIn: Readonly<Record<string, string>> = { origin: origin(), cookie: cookieFor(token) };
    expect(await handshake({ origin: origin() })).toEqual({ status: 401 });
    expect(await handshake({ origin: origin(), cookie: 'orbit_session=forged' })).toEqual({ status: 401 });
    expect(await handshake({ cookie: cookieFor(token) })).toEqual({ status: 403 });
    expect(await handshake({ ...signedIn, origin: 'https://evil.example' })).toEqual({ status: 403 });
    expect(await handshake({ ...signedIn, host: `rebind.example:${port}` })).toEqual({ status: 421 });
    expect(await handshake(signedIn, '/api/call/GetChats')).toEqual({ status: 404 });
    expect(engines).toHaveLength(0);
  });

  it('dictates: start, audio, live words, final text', async () => {
    const socket: WebSocket = await signedInSocket();
    const started: Promise<DictationReply[]> = nextReplies(socket, 1);
    socket.send(JSON.stringify({ type: 'start', id: 1 }));
    expect(await started).toEqual([{ type: 'started', id: 1, start: { session: 1, error: null } }]);
    const rest: Promise<DictationReply[]> = nextReplies(socket, 2);
    socket.send(encodeAudioFrame(1, CHUNK));
    socket.send(JSON.stringify({ type: 'finish', id: 2, session: 1 }));
    expect(await rest).toEqual([
      { type: 'transcript', session: 1, text: HEARD_TEXT },
      { type: 'finished', id: 2, result: { ok: true, text: FINAL_TEXT, error: null } },
    ]);
    const closed: Promise<number> = closeCode(socket);
    socket.close();
    await closed;
    await expect.poll(() => engines.at(-1)?.steps.at(-1)).toBe('stop');
  });

  it('gives each browser its own engine', async () => {
    const phone: WebSocket = await signedInSocket();
    const tablet: WebSocket = await signedInSocket();
    const phoneEngine: RecordingEngine | undefined = engines.at(-2);
    const tabletStarted: Promise<DictationReply[]> = nextReplies(tablet, 1);
    tablet.send(JSON.stringify({ type: 'start', id: 1 }));
    await tabletStarted;
    tablet.send(JSON.stringify({ type: 'cancel', session: 1 }));
    await expect.poll(() => engines.at(-1)?.steps).toContain('cancel 1');
    expect(phoneEngine?.steps).toEqual([]);
    await closeAll([phone, tablet]);
  });

  it('turns away browsers past the cap', async () => {
    const admitted: WebSocket[] = [];
    for (let index: number = 0; index < DICTATION_LIMITS.maxClients; index += 1) admitted.push(await signedInSocket());
    expect(await handshake({ origin: origin(), cookie: cookieFor(token) })).toEqual({ status: 503 });
    await closeAll(admitted);
  });

  it('hangs up on a malformed message', async () => {
    const socket: WebSocket = await signedInSocket();
    const closed: Promise<number> = closeCode(socket);
    socket.send('{"type":"start"}');
    expect(await closed).toBe(CLOSE_UNSUPPORTED_DATA);
  });

  it('ends an open socket at its next message once the token changes', async () => {
    const socket: WebSocket = await signedInSocket();
    const closed: Promise<number> = closeCode(socket);
    token = generateToken();
    socket.send('{"type":"prepare"}');
    expect(await closed).toBe(CLOSE_POLICY_VIOLATION);
  });

  it('logs handshakes like requests, without secrets', () => {
    expect(logLines.some((line: string) => / GET \/api\/dictation 101 \d+ms$/.test(line))).toBe(true);
    expect(logLines.some((line: string) => / GET \/api\/dictation 401 \d+ms$/.test(line))).toBe(true);
    expect(logLines.join('\n')).not.toContain(sessionValueFor(token));
  });

  it('closes the server even with a browser still connected', async () => {
    const other: Server = createRemoteServer({
      routes: DEMO_ROUTES,
      webRoot: '/nonexistent',
      credentials: () => ({ token, trusted: trustedOrigins(port, '') }),
      limiter: new FailureLimiter(SIGN_IN_POLICY),
      dictation: (): RecordingEngine => new RecordingEngine(),
      now: (): number => Date.now(),
      log: (): void => undefined,
    });
    const mainPort: number = port;
    port = await listenLocally(other, 0);
    const socket: WebSocket = await signedInSocket();
    const closed: Promise<number> = closeCode(socket);
    await closeServer(other);
    await closed;
    port = mainPort;
  });
});

describe('content security policy', () => {
  it('lets the page reach its own dictation socket and nothing else', () => {
    const policy: string = contentSecurityPolicy(new Set(['http://127.0.0.1:4690', 'https://orbit.example']));
    expect(policy).toContain("connect-src 'self' ws://127.0.0.1:4690 wss://orbit.example;");
    expect(policy).toContain("frame-ancestors 'none'");
  });
});
