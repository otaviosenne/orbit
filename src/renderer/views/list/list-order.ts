// The List view's row orders, kept free of the DOM so they can be tested on their own.
export type ListSortMode = 'name' | 'manual';

// What ordering needs to know about a chat.
export interface OrderedChat {
  readonly sessionId: string;
  readonly name: string;
  // When its process started: a resumed chat starts again, so it counts as new.
  readonly startedAt: number;
}

// Case and accents fold away ("éclair" sits with "Eclair"); the plain comparison and then the id break ties, so
// two chats with the same name never swap places between polls.
export function compareByName(a: OrderedChat, b: OrderedChat): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name) || a.sessionId.localeCompare(b.sessionId);
}

export function alphabeticalOrder(chats: readonly OrderedChat[]): string[] {
  return [...chats].sort(compareByName).map((chat: OrderedChat) => chat.sessionId);
}

// The saved order with closed chats left out, then chats it has never seen, oldest first, so the newest chat is
// always last. With nothing saved that is still open, the list starts from A–Z, as it looked before Manual.
export function mergeManualOrder(saved: readonly string[], chats: readonly OrderedChat[]): string[] {
  const open: Set<string> = new Set(chats.map((chat: OrderedChat) => chat.sessionId));
  const kept: string[] = [...new Set(saved)].filter((sessionId: string) => open.has(sessionId));
  if (kept.length === 0) return alphabeticalOrder(chats);
  const placed: Set<string> = new Set(kept);
  const newcomers: OrderedChat[] = chats.filter((chat: OrderedChat) => !placed.has(chat.sessionId)).sort(compareByArrival);
  return [...kept, ...newcomers.map((chat: OrderedChat) => chat.sessionId)];
}

function compareByArrival(a: OrderedChat, b: OrderedChat): number {
  return a.startedAt - b.startedAt || compareByName(a, b);
}

export function listOrder(mode: ListSortMode, chats: readonly OrderedChat[], saved: readonly string[]): string[] {
  return mode === 'name' ? alphabeticalOrder(chats) : mergeManualOrder(saved, chats);
}

// The item at `from` taken out and put back at `to`; both are clamped, so a drop past either end lands there.
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return [...items];
  const moved: T[] = [...items];
  const [item] = moved.splice(from, 1);
  if (item === undefined) return [...items];
  moved.splice(Math.min(Math.max(to, 0), moved.length), 0, item);
  return moved;
}
