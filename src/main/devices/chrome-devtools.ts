import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { PageTarget } from '../../core/devices/browser-match';

const DEVTOOLS_HOST: string = '127.0.0.1';
// A Chrome that exposes DevTools answers locally in milliseconds; past this it is busy or gone.
const DEVTOOLS_TIMEOUT_MS: number = 1500;
const PORT_FLAG: RegExp = /^--remote-debugging-port=(\d+)$/;
// Only Chrome's own binary: an Electron app also accepts the flag and must never have its pages touched.
const CHROME_BINARY: RegExp = /^(chrome|google-chrome.*|chromium.*)$/;
// ZapZap's debugger, and the ports Orbit's own development copies listen on.
const ZAPZAP_DEBUG_PORT: number = 9333;
const ORBIT_DEV_PORTS_FIRST: number = 9412;
const ORBIT_DEV_PORTS_LAST: number = 9451;
const NUL: string = '\0';

interface DevToolsTarget {
  readonly id?: unknown;
  readonly type?: unknown;
  readonly title?: unknown;
  readonly url?: unknown;
}

// The DevTools port a Chrome browser process was started with; null when it has none or is not Chrome.
export async function devToolsPortOf(pid: number): Promise<number | null> {
  try {
    const args: string[] = (await readFile(`/proc/${pid}/cmdline`, 'utf8')).split(NUL);
    if (!CHROME_BINARY.test(basename(args[0] ?? ''))) return null;
    const port: number | null = args.map((arg: string) => PORT_FLAG.exec(arg)?.[1]).map(Number).find((value: number) => value > 0) ?? null;
    return port === null || isReservedPort(port) ? null : port;
  } catch {
    return null;
  }
}

// Read-only: lists the browser's tabs, never opens, closes or drives any of them.
export async function listPageTargets(port: number): Promise<PageTarget[]> {
  try {
    const response: Response = await fetch(devToolsUrl(port, '/json/list'), { signal: AbortSignal.timeout(DEVTOOLS_TIMEOUT_MS) });
    if (!response.ok) return [];
    const targets: DevToolsTarget[] = (await response.json()) as DevToolsTarget[];
    return targets.flatMap(toPageTarget);
  } catch {
    return [];
  }
}

// Makes the tab the active one in its window; the only change Orbit ever asks of Chrome.
export async function activatePageTarget(port: number, targetId: string): Promise<boolean> {
  try {
    const path: string = `/json/activate/${encodeURIComponent(targetId)}`;
    return (await fetch(devToolsUrl(port, path), { signal: AbortSignal.timeout(DEVTOOLS_TIMEOUT_MS) })).ok;
  } catch {
    return false;
  }
}

function isReservedPort(port: number): boolean {
  return port === ZAPZAP_DEBUG_PORT || (port >= ORBIT_DEV_PORTS_FIRST && port <= ORBIT_DEV_PORTS_LAST);
}

function devToolsUrl(port: number, path: string): string {
  return `http://${DEVTOOLS_HOST}:${port}${path}`;
}

function toPageTarget(target: DevToolsTarget): PageTarget[] {
  const { id, type, title, url } = target;
  if (type !== 'page' || typeof id !== 'string' || typeof url !== 'string') return [];
  return [{ id, title: typeof title === 'string' ? title : '', url }];
}
