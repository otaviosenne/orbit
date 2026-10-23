import type { ColumnKey, RestingColumn } from '../views/board-columns';
import type { ReorderTarget } from './reorder-target';

// Every place on the board a card can be picked up from or dropped on. "columns" is the whole area under the
// Pinned row, which a card taken out of Pinned treats as one zone; "suspended" is the section under the columns.
export type BoardZone = 'pinned' | 'columns' | 'suspended' | ColumnKey;

export interface DragSource {
  // Where the card was picked up: a pinned chat has a card in the Pinned row and one in its column.
  readonly zone: BoardZone;
  readonly isPinned: boolean;
  // False for a closed chat's stand-in (no process to close) and on Orbit Web, where closing chats is desktop-only.
  readonly canSuspend: boolean;
}

export type DropAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'pin' }
  | { readonly kind: 'unpin' }
  | { readonly kind: 'suspend' }
  | { readonly kind: 'rest'; readonly column: RestingColumn }
  // Within the section the card came from; the target is where the pointer put it, null until it is over a card.
  | { readonly kind: 'reorder'; readonly zone: BoardZone; readonly target: ReorderTarget | null };

const NO_ACTION: DropAction = { kind: 'none' };
const PIN: DropAction = { kind: 'pin' };
const UNPIN: DropAction = { kind: 'unpin' };
const SUSPEND: DropAction = { kind: 'suspend' };

// A card taken out of Pinned only means "unpin", so the columns act as one zone for it; a column card keeps the
// individual zones (Pinned and each column). Any open chat can be dropped on Suspended; a suspended card is
// reopened from its panel, never by a drop, so only its own section is in play for it (to reorder).
export function isZoneInPlay(source: DragSource, zone: BoardZone): boolean {
  if (zone === source.zone) return true;
  if (source.zone === 'suspended') return false;
  if (zone === 'suspended') return source.canSuspend;
  return source.zone === 'pinned' ? zone === 'pinned' || zone === 'columns' : zone !== 'columns';
}

// Needs you and Working follow the chat's live state, so a drop can never put a card there; only the
// Pinned row, the Active/Idle split and suspending are choices the user owns.
export function dropActionFor(source: DragSource, to: BoardZone): DropAction {
  if (to === source.zone) return { kind: 'reorder', zone: to, target: null };
  if (!isZoneInPlay(source, to)) return NO_ACTION;
  if (to === 'suspended') return SUSPEND;
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
  if (action.kind === 'suspend') return 'Suspend';
  if (action.kind === 'rest') return 'Move here';
  return null;
}
