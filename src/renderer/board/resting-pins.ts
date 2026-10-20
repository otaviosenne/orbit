import type { ChatSnapshot } from '../../shared/types';
import type { RestingColumn } from '../views/board-columns';

const STORAGE_KEY: string = 'orbit.resting-pins';

interface RestingPinEntry {
  readonly column: RestingColumn;
  // The resting stretch the choice was made in; once the chat works again it no longer applies.
  readonly statusSince: number;
}

// Active/Idle placed by hand (dragging a card), kept across launches.
export class RestingPins {
  private readonly entries: Map<string, RestingPinEntry> = new Map(load());

  pinOf(chat: ChatSnapshot): RestingColumn | null {
    const entry: RestingPinEntry | undefined = this.entries.get(chat.sessionId);
    return entry !== undefined && entry.statusSince === chat.statusSince ? entry.column : null;
  }

  set(chat: ChatSnapshot, column: RestingColumn): void {
    this.entries.set(chat.sessionId, { column, statusSince: chat.statusSince });
    save([...this.entries]);
  }
}

// Storage can be unavailable; then the choices last for this run only.
function load(): [string, RestingPinEntry][] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? (stored as [string, RestingPinEntry][]) : [];
  } catch {
    return [];
  }
}

function save(entries: [string, RestingPinEntry][]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Not persisted.
  }
}
