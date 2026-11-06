import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RemoteDevice } from '../../shared/remote-settings';
import { writePrivateFile } from './private-file';

const DEVICES_FILE: string = 'devices.json';
// The id only finds the entry; the secret is what proves the cookie, and only its hash is kept on disk.
const ID_BYTES: number = 9;
const SECRET_BYTES: number = 32;
const COOKIE_SEPARATOR: string = '.';
// Every sign-in from a browser that lost its cookie adds one; past this, the one unseen the longest goes.
export const MAX_DEVICES: number = 50;
// Last seen moves on every request; the file only follows it this often, so a busy phone does not write on each poll.
const LAST_SEEN_SAVE_MS: number = 5 * 60_000;
const JSON_INDENT: number = 2;

interface DeviceEntry extends RemoteDevice {
  readonly secretHash: string;
}

export interface NewDevice {
  readonly device: RemoteDevice;
  // What the browser keeps in its cookie: the id and the secret, never stored here in the clear.
  readonly cookieValue: string;
}

// Each browser signed in to Orbit Web, so the desktop can list them and sign any one out. A cookie is good while its
// entry exists, whatever happens to the access token.
export class DeviceSessions {
  private entries: Map<string, DeviceEntry> = new Map();
  private savedAt: number = 0;
  // Writes run one after another, so an older list never lands on top of a newer one.
  private writing: Promise<void> = Promise.resolve();
  private readonly path: string;

  constructor(
    private readonly dir: string,
    private readonly log: (line: string) => void = (): void => undefined,
  ) {
    this.path = join(dir, DEVICES_FILE);
  }

  async load(): Promise<void> {
    try {
      const raw: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      const entries: DeviceEntry[] = Array.isArray(raw) ? raw.filter(isDeviceEntry) : [];
      this.entries = new Map(entries.map((entry: DeviceEntry): [string, DeviceEntry] => [entry.id, entry]));
    } catch {
      this.entries = new Map();
    }
  }

  list(): RemoteDevice[] {
    return [...this.entries.values()].map(publicView).sort((a: RemoteDevice, b: RemoteDevice) => b.lastSeenAt - a.lastSeenAt);
  }

  create(name: string, now: number): NewDevice {
    const id: string = randomBytes(ID_BYTES).toString('base64url');
    const secret: string = randomBytes(SECRET_BYTES).toString('base64url');
    const entry: DeviceEntry = { id, name, createdAt: now, lastSeenAt: now, secretHash: hashOf(secret) };
    this.entries.set(id, entry);
    this.dropOldest();
    this.persist(now);
    return { device: publicView(entry), cookieValue: `${id}${COOKIE_SEPARATOR}${secret}` };
  }

  // The device a cookie belongs to, or null; a match also marks the device as seen now.
  verify(cookieValue: string, now: number): RemoteDevice | null {
    const separator: number = cookieValue.indexOf(COOKIE_SEPARATOR);
    if (separator === -1) return null;
    const entry: DeviceEntry | undefined = this.entries.get(cookieValue.slice(0, separator));
    if (entry === undefined || !hashesMatch(hashOf(cookieValue.slice(separator + 1)), entry.secretHash)) return null;
    const seen: DeviceEntry = { ...entry, lastSeenAt: now };
    this.entries.set(entry.id, seen);
    if (now - this.savedAt >= LAST_SEEN_SAVE_MS) this.persist(now);
    return publicView(seen);
  }

  revoke(id: string, now: number): boolean {
    const removed: boolean = this.entries.delete(id);
    if (removed) this.persist(now);
    return removed;
  }

  revokeAll(now: number): void {
    this.entries.clear();
    this.persist(now);
  }

  private dropOldest(): void {
    while (this.entries.size > MAX_DEVICES) {
      const oldest: DeviceEntry = [...this.entries.values()].reduce((a: DeviceEntry, b: DeviceEntry) => (b.lastSeenAt < a.lastSeenAt ? b : a));
      this.entries.delete(oldest.id);
    }
  }

  // Not awaited by sign-ins and checks: the list in memory is what counts, the file only brings it back after a restart.
  private persist(now: number): void {
    this.savedAt = now;
    const text: string = `${JSON.stringify([...this.entries.values()], null, JSON_INDENT)}\n`;
    this.writing = this.writing
      .then((): Promise<void> => writePrivateFile(this.dir, this.path, text))
      .catch((error: unknown): void => this.log(`[orbit-web] could not save devices: ${error instanceof Error ? error.message : String(error)}`));
  }

  // Resolves once every change so far is on disk; tests and shutdown wait on it.
  flushed(): Promise<void> {
    return this.writing;
  }
}

function publicView(entry: DeviceEntry): RemoteDevice {
  return { id: entry.id, name: entry.name, createdAt: entry.createdAt, lastSeenAt: entry.lastSeenAt };
}

function hashOf(secret: string): string {
  return createHash('sha256').update(secret).digest('base64url');
}

// Both are hashes of the same length, so the comparison takes the same time whatever was sent.
function hashesMatch(given: string, expected: string): boolean {
  const a: Buffer = Buffer.from(given);
  const b: Buffer = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isDeviceEntry(value: unknown): value is DeviceEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry: Record<string, unknown> = value as Record<string, unknown>;
  return (
    typeof entry['id'] === 'string' &&
    typeof entry['name'] === 'string' &&
    typeof entry['secretHash'] === 'string' &&
    typeof entry['createdAt'] === 'number' &&
    typeof entry['lastSeenAt'] === 'number'
  );
}
