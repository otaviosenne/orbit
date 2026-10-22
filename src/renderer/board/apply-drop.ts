import type { RestingColumn } from '../views/board-columns';
import type { DropAction } from './drop-rules';

export interface DropEffects {
  readonly pin: (sessionId: string) => void;
  readonly unpin: (sessionId: string) => void;
  readonly rest: (sessionId: string, column: RestingColumn) => void;
  readonly suspend: (sessionId: string) => void;
}

// Carries out a drop the rules allowed; a drop that does nothing never gets here.
export function applyDrop(sessionId: string, action: DropAction, effects: DropEffects): void {
  if (action.kind === 'pin') effects.pin(sessionId);
  if (action.kind === 'unpin') effects.unpin(sessionId);
  if (action.kind === 'rest') effects.rest(sessionId, action.column);
  if (action.kind === 'suspend') effects.suspend(sessionId);
}
