import type { ColumnKey, RestingColumn } from '../views/board-columns';

// Every place on the board a card can be picked up from or dropped on.
export type BoardZone = 'pinned' | ColumnKey;

export interface DragSource {
  // Where the card was picked up: a pinned chat has a card in the Pinned row and one in its column.
  readonly zone: BoardZone;
  // The column the chat sits in right now; null for a pinned chat whose window is closed.
  readonly column: ColumnKey | null;
  readonly isPinned: boolean;
}

export type DropAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'pin' }
  | { readonly kind: 'unpin'; readonly rest: RestingColumn | null }
  | { readonly kind: 'rest'; readonly column: RestingColumn };

const NO_ACTION: DropAction = { kind: 'none' };

// Needs you and Working follow the chat's live state, so a drop can never put a card there; only the
// Pinned row and the Active/Idle split are choices the user owns.
export function dropActionFor(source: DragSource, to: BoardZone): DropAction {
  if (to === source.zone) return NO_ACTION;
  if (to === 'pinned') return source.isPinned ? NO_ACTION : { kind: 'pin' };
  const rest: RestingColumn | null = restingMove(source.column, to);
  if (source.zone === 'pinned') return { kind: 'unpin', rest };
  return rest === null ? NO_ACTION : { kind: 'rest', column: rest };
}

// A resting chat can be moved between Active and Idle; a busy or unseen one would not stay put.
function restingMove(from: ColumnKey | null, to: ColumnKey): RestingColumn | null {
  if (from === null || from === to || !isRestingColumn(from) || !isRestingColumn(to)) return null;
  return to;
}

function isRestingColumn(column: ColumnKey): column is RestingColumn {
  return column === 'active' || column === 'idle';
}

// What the hovered zone says it will do; null when the drop does nothing.
export function dropHint(action: DropAction): string | null {
  if (action.kind === 'pin') return 'Pin';
  if (action.kind === 'unpin') return action.rest === null ? 'Unpin' : 'Unpin and move here';
  if (action.kind === 'rest') return 'Move here';
  return null;
}
