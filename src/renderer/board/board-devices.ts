import type { ChatDevices } from '../../shared/types';

export type DeviceAsk = (sessionId: string) => Promise<ChatDevices>;

export const NO_DEVICES: ChatDevices = { emulator: null, browser: null };
// The main process keeps the window list this long; asking more often would only re-read the same list.
const REFRESH_MS: number = 3000;

interface Answer {
  readonly devices: ChatDevices;
  readonly askedAt: number;
}

// The emulator and Chrome tab of every chat on the board or in the Panel, for the icons beside each chat's name.
// Both views draw from this synchronously, so answers are kept here and the view redrawn only when one changes.
export class BoardDevices {
  private readonly answers: Map<string, Answer> = new Map();
  private readonly pending: Set<string> = new Set();
  private listed: ReadonlySet<string> = new Set();

  constructor(private readonly ask: DeviceAsk, private readonly changed: () => void) {}

  devicesOf(sessionId: string): ChatDevices {
    return this.answers.get(sessionId)?.devices ?? NO_DEVICES;
  }

  // Called with the shown chats on each poll; chats that left are forgotten.
  async follow(sessionIds: readonly string[], now: number): Promise<void> {
    this.listed = new Set(sessionIds);
    for (const sessionId of [...this.answers.keys()]) if (!this.listed.has(sessionId)) this.answers.delete(sessionId);
    const due: string[] = sessionIds.filter((sessionId: string) => this.isDue(sessionId, now));
    await this.refreshAll(due, now);
  }

  // A click that found nothing to focus asks again at once, so the stale icon goes away without waiting.
  async recheck(sessionId: string, now: number): Promise<void> {
    if (this.listed.has(sessionId) && !this.pending.has(sessionId)) await this.refreshAll([sessionId], now);
  }

  private isDue(sessionId: string, now: number): boolean {
    if (this.pending.has(sessionId)) return false;
    const answer: Answer | undefined = this.answers.get(sessionId);
    return answer === undefined || now - answer.askedAt >= REFRESH_MS;
  }

  // One redraw per round, however many chats answered in it.
  private async refreshAll(sessionIds: readonly string[], now: number): Promise<void> {
    const changes: boolean[] = await Promise.all(sessionIds.map((sessionId: string) => this.refresh(sessionId, now)));
    if (changes.some((changed: boolean) => changed)) this.changed();
  }

  private async refresh(sessionId: string, now: number): Promise<boolean> {
    this.pending.add(sessionId);
    try {
      const devices: ChatDevices = await this.ask(sessionId).catch((): ChatDevices => NO_DEVICES);
      // The chat may have left the board while it was asked about.
      if (!this.listed.has(sessionId)) return false;
      const before: ChatDevices = this.devicesOf(sessionId);
      this.answers.set(sessionId, { devices, askedAt: now });
      return !sameDevices(before, devices);
    } finally {
      this.pending.delete(sessionId);
    }
  }
}

export function sameDevices(a: ChatDevices, b: ChatDevices): boolean {
  return a.emulator?.label === b.emulator?.label && a.browser?.title === b.browser?.title && a.browser?.url === b.browser?.url;
}
