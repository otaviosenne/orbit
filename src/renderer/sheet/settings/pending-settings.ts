import { modelChoiceOf } from '../../../shared/chat-settings';
import type { PermissionMode } from '../../../shared/permission-modes';
import type { ChatSettings } from '../../../shared/types';

// Long enough for the chat to run /model or /effort; after that whatever the chat reports wins again.
const PENDING_TTL_MS: number = 20_000;

export type SettingField = keyof ChatSettings | 'permissionMode';

interface PendingValue {
  readonly value: string;
  // What the chat reported when the pick was made; any other report means the chat has answered it.
  readonly before: string | null;
  readonly since: number;
}

// Optimistic picks in the settings popover: shown at once, kept until the chat reports a new value, and
// taken back if the command could not be delivered.
export class PendingSettings {
  private readonly pending: Map<string, PendingValue> = new Map();

  set(sessionId: string, field: SettingField, value: string, before: string | null, now: number): void {
    this.pending.set(key(sessionId, field), { value, before, since: now });
  }

  // Call after apply(), which settles the picks the chat has answered.
  hasPending(sessionId: string): boolean {
    return [...this.pending.keys()].some((entry: string) => entry.startsWith(`${sessionId}/`));
  }

  drop(sessionId: string, field: SettingField): void {
    this.pending.delete(key(sessionId, field));
  }

  apply(sessionId: string, polled: ChatSettings, now: number): ChatSettings {
    return {
      model: this.resolve(sessionId, 'model', polled.model, now),
      effort: this.resolve(sessionId, 'effort', polled.effort, now) as ChatSettings['effort'],
    };
  }

  applyMode(sessionId: string, polled: PermissionMode | null, now: number): PermissionMode | null {
    return this.resolve(sessionId, 'permissionMode', polled, now) as PermissionMode | null;
  }

  private resolve(sessionId: string, field: SettingField, polled: string | null, now: number): string | null {
    const entry: PendingValue | undefined = this.pending.get(key(sessionId, field));
    if (entry === undefined) return polled;
    if (now - entry.since > PENDING_TTL_MS || hasAnswered(field, entry, polled)) {
      this.drop(sessionId, field);
      return polled;
    }
    return entry.value;
  }
}

// A capped effort still counts as an answer: the chat reports the level that really took effect.
function hasAnswered(field: SettingField, entry: PendingValue, polled: string | null): boolean {
  if (polled === null) return false;
  return sameSetting(field, polled, entry.value) || entry.before === null || !sameSetting(field, polled, entry.before);
}

// A model may come back as an id, an alias or a display name, so models compare by the choice they belong to.
export function sameSetting(field: SettingField, a: string, b: string): boolean {
  if (field !== 'model') return a === b;
  return a === b || (modelChoiceOf(a) !== null && modelChoiceOf(a) === modelChoiceOf(b));
}

function key(sessionId: string, field: SettingField): string {
  return `${sessionId}/${field}`;
}
