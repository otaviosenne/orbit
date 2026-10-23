import type { RestingColumn } from '../views/board-columns';
import type { BoardZone, DropAction } from './drop-rules';
import type { ReorderTarget } from './reorder-target';

export interface DropEffects {
  readonly pin: (sessionId: string) => void;
  readonly unpin: (sessionId: string) => void;
  readonly rest: (sessionId: string, column: RestingColumn) => void;
  readonly suspend: (sessionId: string) => void;
  readonly reorder: (sessionId: string, zone: BoardZone, target: ReorderTarget) => void;
}

// Carries out a drop the rules allowed; a drop that does nothing never gets here.
export function applyDrop(sessionId: string, action: DropAction, effects: DropEffects): void {
  if (action.kind === 'pin') effects.pin(sessionId);
  if (action.kind === 'unpin') effects.unpin(sessionId);
  if (action.kind === 'rest') effects.rest(sessionId, action.column);
  if (action.kind === 'suspend') effects.suspend(sessionId);
  if (action.kind === 'reorder' && action.target !== null) effects.reorder(sessionId, action.zone, action.target);
}
