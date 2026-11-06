import type { OriginState } from './power-progress';

// Served by the orbit-wake Worker in front of Orbit Web (~/.config/wake-pc/worker), which asks the tunnel itself.
const WAKE_STATUS_PATH: string = '/__wake/status';
// Cloudflare's answers when nothing is behind the tunnel (530) or Orbit itself is not answering (the others).
const NO_TUNNEL: number = 530;
const ORIGIN_DOWN: ReadonlySet<number> = new Set([502, 503, 504, 520, 521, 522, 523, 524, NO_TUNNEL]);

export async function probeOrigin(): Promise<OriginState> {
  return (await askWorker()) ?? (await askOrigin());
}

// Old Workers answer only { online }; with no Worker in front, the path reaches Orbit and is not this JSON.
async function askWorker(): Promise<OriginState | null> {
  try {
    const body: { state?: unknown; online?: unknown } = await (await fetch(WAKE_STATUS_PATH, { cache: 'no-store' })).json();
    if (body.state === 'online' || body.state === 'starting' || body.state === 'off') return body.state;
    return typeof body.online === 'boolean' ? (body.online ? 'online' : 'off') : null;
  } catch {
    return null;
  }
}

// Without the Worker, the page's own address tells Orbit up from down, but not a booting PC from an off one.
async function askOrigin(): Promise<OriginState> {
  try {
    const response: Response = await fetch(new URL('./', window.location.href), { method: 'HEAD', cache: 'no-store' });
    if (!ORIGIN_DOWN.has(response.status)) return 'online';
    return response.status === NO_TUNNEL ? 'off' : 'starting';
  } catch {
    return 'unknown';
  }
}

export function isOriginDownStatus(status: number): boolean {
  return ORIGIN_DOWN.has(status);
}
