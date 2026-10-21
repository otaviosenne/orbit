import type { ColumnKey, RestingColumn } from '../views/board-columns';

// Every place on the board a card can be picked up from or dropped on. "columns" is the whole area under the
// Pinned row, which a card taken out of Pinned treats as one zone.
export type BoardZone = 'pinned' | 'columns' | ColumnKey;

export interface DragSource {
  // Where the card was picked up: a pinned chat has a card in the Pinned row and one in its column.
  readonly zone: BoardZone;
  readonly isPinned: boolean;
}

export type DropAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'pin' }
  | { readonly kind: 'unpin' }
  | { readonly kind: 'rest'; readonly column: RestingColumn };

const NO_ACTION: DropAction = { kind: 'none' };
const PIN: DropAction = { kind: 'pin' };
const UNPIN: DropAction = { kind: 'unpin' };

// A card taken out of Pinned only means "unpin", so the columns act as one zone for it; a column card keeps the
// individual zones (Pinned and each column).
export function isZoneInPlay(source: DragSource, zone: BoardZone): boolean {
  return source.zone === 'pinned' ? zone === 'pinned' || zone === 'columns' : zone !== 'columns';
}

// Needs you and Working follow the chat's live state, so a drop can never put a card there; only the
// Pinned row and the Active/Idle split are choices the user owns.
export function dropActionFor(source: DragSource, to: BoardZone): DropAction {
  if (to === source.zone || !isZoneInPlay(source, to)) return NO_ACTION;
  if (source.zone === 'pinned') return UNPIN;
  if (to === 'pinned') return source.isPinned ? NO_ACTION : PIN;
  const rest: RestingColumn | null = restingMove(source.zone, to);
  return rest === null ? NO_ACTION : { kind: 'rest', column: rest };
}

// A resting chat can be moved between Active and Idle; a busy or unseen one would not stay put.
function restingMove(from: BoardZone, to: BoardZone): RestingColumn | null {
  return isRestingColumn(from) && isRestingColumn(to) ? to : null;
}

function isRestingColumn(zone: BoardZone): zone is RestingColumn {
  return zone === 'active' || zone === 'idle';
}

// What the hovered zone says it will do; null when the drop does nothing.
export function dropHint(action: DropAction): string | null {
  if (action.kind === 'pin') return 'Pin';
  if (action.kind === 'unpin') return 'Unpin';
  if (action.kind === 'rest') return 'Move here';
  return null;
}
