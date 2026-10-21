// The side panel (beside the Board and the other views) or the Panel view with its tiles.
export type VoiceSurface = 'drawer' | 'panel';

export interface PlaceCandidates<T> {
  readonly surface: VoiceSurface;
  // The side panel's composer, while it shows a chat that can be written to.
  readonly drawer: T | null;
  // The tile composer that has focus.
  readonly tile: T | null;
}

// Hands-free words go to the composer of the surface on screen. The side panel has no place beside the Panel, and
// a tile left focused is no target once the Panel is gone, even though leaving it fires no blur.
export function resolvePlace<T>(candidates: PlaceCandidates<T>): T | null {
  return candidates.surface === 'panel' ? candidates.tile : candidates.drawer;
}
