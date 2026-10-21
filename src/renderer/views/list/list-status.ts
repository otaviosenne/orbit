import type { ChatSnapshot } from '../../../shared/types';
import type { BoardColumn, ColumnKey, RestingPin, UnseenCheck } from '../board-columns';
import { toBoardColumns } from '../board-columns';

// The Board column a chat sits in, with that column's title, so a row says what its card would.
export interface ListStatus {
  readonly key: ColumnKey;
  readonly label: string;
}

// The Board's own rules decide, so the List can never disagree with it (Active vs Idle, unseen replies, drags).
export function listStatuses(chats: readonly ChatSnapshot[], isUnseen: UnseenCheck, now: number, restingPin: RestingPin): Map<string, ListStatus> {
  const statuses: Map<string, ListStatus> = new Map();
  for (const column of toBoardColumns(chats, isUnseen, now, restingPin)) addColumn(statuses, column);
  return statuses;
}

function addColumn(statuses: Map<string, ListStatus>, column: BoardColumn): void {
  for (const chat of column.chats) statuses.set(chat.sessionId, { key: column.key, label: column.title });
}
