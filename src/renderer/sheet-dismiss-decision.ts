// A sheet pulled down past this share of its height, or flicked down this fast, closes; anything less springs back.
const CLOSE_FRACTION: number = 0.25;
const FLICK_PX_PER_MS: number = 0.6;

export interface SheetPull {
  readonly distance: number;
  readonly height: number;
  readonly velocity: number;
}

export function shouldDismissSheet(pull: SheetPull): boolean {
  if (pull.distance <= 0) return false;
  return pull.distance >= pull.height * CLOSE_FRACTION || pull.velocity >= FLICK_PX_PER_MS;
}
