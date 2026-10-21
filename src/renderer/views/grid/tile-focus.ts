// Where focus went after a focus change is only known once the change has finished.
export const FOCUS_SETTLE_MS: number = 0;

// The tile that keeps the hands-free target: the one whose composer has focus now. Switching to another window takes
// the focus off every field yet leaves the target where it was, as the side panel's target does not move either.
export function nextFocusedTile<T>(current: T | null, focused: T | null, isWindowFocused: boolean): T | null {
  if (focused !== null) return focused;
  return isWindowFocused ? null : current;
}

export interface FocusableTile {
  readonly hasComposerFocus: boolean;
}

// Follows which tile's composer has focus, for hands-free dictation in the Panel.
export class TileFocus<T extends FocusableTile> {
  private current: T | null = null;

  constructor(area: HTMLElement, private readonly tiles: () => Iterable<T>, private readonly onChange: (tile: T | null) => void) {
    area.addEventListener('focusin', (): void => this.settleLater());
    area.addEventListener('focusout', (): void => this.settleLater());
  }

  get tile(): T | null {
    return this.current;
  }

  // Also called when tiles leave the grid, since a removed field may take its focus away without a blur.
  settle(): void {
    const current: T | null = this.isListed(this.current) ? this.current : null;
    const next: T | null = nextFocusedTile(current, this.focusedTile(), document.hasFocus());
    if (next === this.current) return;
    this.current = next;
    this.onChange(next);
  }

  private settleLater(): void {
    window.setTimeout((): void => this.settle(), FOCUS_SETTLE_MS);
  }

  private isListed(tile: T | null): boolean {
    for (const listed of this.tiles()) if (listed === tile) return true;
    return false;
  }

  private focusedTile(): T | null {
    for (const tile of this.tiles()) if (tile.hasComposerFocus) return tile;
    return null;
  }
}
