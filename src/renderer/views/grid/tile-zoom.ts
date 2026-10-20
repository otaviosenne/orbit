import { BUTTON_ZOOM_STEP, WHEEL_ZOOM_STEP, formatZoom, parseZoom, stepZoom } from './zoom-level';

const STORAGE_KEY: string = 'orbit.grid-zoom';

export type ZoomChanged = (zoom: number) => void;

// One text size for every tile, changed with the sidebar's − / + or Ctrl + wheel over the tiles, and remembered.
export class TileZoom {
  private current: number = load();

  constructor(tiles: HTMLElement, private readonly onChange: ZoomChanged) {
    // Not passive: the default Ctrl+wheel behaviour (zooming the whole page) must be stopped.
    tiles.addEventListener('wheel', (event: WheelEvent): void => this.handleWheel(event), { passive: false });
  }

  get zoom(): number {
    return this.current;
  }

  step(direction: 1 | -1): void {
    this.set(stepZoom(this.current, direction, BUTTON_ZOOM_STEP));
  }

  private handleWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return;
    event.preventDefault();
    this.set(stepZoom(this.current, event.deltaY < 0 ? 1 : -1, WHEEL_ZOOM_STEP));
  }

  private set(zoom: number): void {
    if (zoom === this.current) return;
    this.current = zoom;
    save(zoom);
    this.onChange(zoom);
  }
}

// Storage can be unavailable; then the size simply lasts for this run.
function load(): number {
  try {
    return parseZoom(localStorage.getItem(STORAGE_KEY));
  } catch {
    return parseZoom(null);
  }
}

function save(zoom: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, formatZoom(zoom));
  } catch {
    // Not persisted.
  }
}
