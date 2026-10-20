import type { ChatSnapshot } from '../shared/types';

// Long enough for the chat to pick up /rename or /color; after that the real value wins again.
const PENDING_TTL_MS: number = 20_000;

export interface ChatPatch {
  readonly name?: string;
  readonly color?: string;
}

interface PendingPatch {
  readonly patch: ChatPatch;
  readonly since: number;
}

// Optimistic edits: a rename or recolor shows immediately and stays until the chat reports the same value.
export class PendingEdits {
  private readonly pending: Map<string, PendingPatch> = new Map();

  set(sessionId: string, patch: ChatPatch, now: number): void {
    const current: ChatPatch = this.pending.get(sessionId)?.patch ?? {};
    this.pending.set(sessionId, { patch: { ...current, ...patch }, since: now });
  }

  // Undoes an edit whose command could not be delivered.
  drop(sessionId: string, field: keyof ChatPatch): void {
    const entry: PendingPatch | undefined = this.pending.get(sessionId);
    if (entry === undefined) return;
    const { [field]: _dropped, ...rest } = entry.patch;
    this.store(sessionId, rest, entry.since);
  }

  apply(chats: readonly ChatSnapshot[], now: number): ChatSnapshot[] {
    return chats.map((chat: ChatSnapshot) => this.applyTo(chat, now));
  }

  private applyTo(chat: ChatSnapshot, now: number): ChatSnapshot {
    const entry: PendingPatch | undefined = this.pending.get(chat.sessionId);
    if (entry === undefined) return chat;
    if (now - entry.since > PENDING_TTL_MS) {
      this.pending.delete(chat.sessionId);
      return chat;
    }
    // A field the chat already reports is confirmed and no longer needs overriding.
    const open: ChatPatch = {
      ...(entry.patch.name !== undefined && entry.patch.name !== chat.name ? { name: entry.patch.name } : {}),
      ...(entry.patch.color !== undefined && entry.patch.color !== chat.color ? { color: entry.patch.color } : {}),
    };
    this.store(chat.sessionId, open, entry.since);
    return { ...chat, ...open };
  }

  private store(sessionId: string, patch: ChatPatch, since: number): void {
    if (Object.keys(patch).length === 0) this.pending.delete(sessionId);
    else this.pending.set(sessionId, { patch, since });
  }
}
