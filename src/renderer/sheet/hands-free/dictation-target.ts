// Which composer hands-free words go to: the side panel's for a live chat or for a chat still starting (no session
// yet), or a Panel tile's. A chat can be both in the side panel and in a tile; those are two different composers.
export type DictationTarget =
  | { readonly kind: 'chat'; readonly sessionId: string }
  | { readonly kind: 'starting' }
  | { readonly kind: 'tile'; readonly sessionId: string };

// none: same composer. pause: no composer on screen. resume: a composer is back after a pause.
// carry: a starting chat went live, keeping the same text. switch: another composer.
export type RetargetPlan = 'none' | 'pause' | 'resume' | 'carry' | 'switch';

export function planRetarget(from: DictationTarget | null, to: DictationTarget | null): RetargetPlan {
  if (isSameTarget(from, to)) return 'none';
  if (to === null) return 'pause';
  if (from === null) return 'resume';
  // The panel hands a starting chat's draft over to the live chat unchanged, so the words keep flowing.
  if (from.kind === 'starting' && to.kind === 'chat') return 'carry';
  return 'switch';
}

function isSameTarget(from: DictationTarget | null, to: DictationTarget | null): boolean {
  if (from === null || to === null) return from === to;
  if (from.kind === 'starting' || to.kind === 'starting') return from.kind === to.kind;
  return from.kind === to.kind && from.sessionId === to.sessionId;
}
