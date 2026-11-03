import type { ChatDevices, ChatSnapshot, EmulatorLink } from '../../shared/types';

const STORAGE_KEY: string = 'orbit.closed-emulators';
// The device list still shows a closed emulator until its next refresh; only a sighting after this means the chat
// opened it again by itself.
const REOPEN_GRACE_MS: number = 30_000;

interface ClosedEmulator {
  readonly avd: string;
  readonly closedAt: number;
}

export type DevicesAsk = (sessionId: string) => Promise<ChatDevices>;

// The emulators "Pause all chats" closed, by the chat that was using each, so Continue can ask that chat to open it
// again, resting or not. Kept across restarts like the paused chats.
export class ClosedEmulators {
  private closed: Map<string, ClosedEmulator> = load();

  constructor(private readonly clock: () => number = Date.now) {}

  avdOf(sessionId: string): string | null {
    return this.closed.get(sessionId)?.avd ?? null;
  }

  // Asked right before the emulators close: afterwards no chat shows one any more.
  async rememberOpen(chats: readonly ChatSnapshot[], ask: DevicesAsk): Promise<void> {
    const links: (EmulatorLink | null)[] = await Promise.all(
      chats.map(async (chat: ChatSnapshot) => (await ask(chat.sessionId).catch((): null => null))?.emulator ?? null),
    );
    chats.forEach((chat: ChatSnapshot, index: number): void => {
      const link: EmulatorLink | null = links[index] ?? null;
      if (link !== null) this.closed.set(chat.sessionId, { avd: avdOf(link.label), closedAt: this.clock() });
    });
    save(this.closed);
  }

  forget(sessionIds: readonly string[]): void {
    const removed: boolean[] = sessionIds.map((sessionId: string) => this.closed.delete(sessionId));
    if (removed.includes(true)) save(this.closed);
  }

  // Chats neither open nor remembered as left open can never be told.
  prune(knownSessionIds: ReadonlySet<string>): void {
    this.forget([...this.closed.keys()].filter((sessionId: string) => !knownSessionIds.has(sessionId)));
  }

  // With every poll: a chat that shows an emulator again reopened it, so Continue must not ask a second time.
  settle(hasEmulator: (sessionId: string) => boolean, now: number): void {
    this.forget([...this.closed].filter(([sessionId, entry]) => now - entry.closedAt >= REOPEN_GRACE_MS && hasEmulator(sessionId)).map(([sessionId]) => sessionId));
  }
}

// A label is "<avd>:<console port>"; the port changes when the emulator starts again, the AVD does not.
function avdOf(label: string): string {
  const portStart: number = label.lastIndexOf(':');
  return portStart < 0 ? label : label.slice(0, portStart);
}

function load(): Map<string, ClosedEmulator> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Map((Array.isArray(parsed) ? parsed : []).flatMap(entryOf));
  } catch {
    return new Map();
  }
}

function entryOf(item: unknown): [string, ClosedEmulator][] {
  const saved: Partial<Record<'sessionId' | 'avd' | 'closedAt', unknown>> = (item ?? {}) as Partial<Record<'sessionId' | 'avd' | 'closedAt', unknown>>;
  const isValid: boolean = typeof saved.sessionId === 'string' && typeof saved.avd === 'string' && typeof saved.closedAt === 'number';
  return isValid ? [[saved.sessionId as string, { avd: saved.avd as string, closedAt: saved.closedAt as number }]] : [];
}

function save(closed: ReadonlyMap<string, ClosedEmulator>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...closed].map(([sessionId, entry]) => ({ sessionId, ...entry }))));
  } catch {
    // Without storage Continue still reaches the paused chats; only the reopen request is lost.
  }
}
