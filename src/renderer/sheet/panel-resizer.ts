const WIDTH_PROPERTY: string = '--panel-width';
const STORAGE_KEY: string = 'claude-radar.panel-width';
const RESIZING_CLASS: string = 'is-resizing';
const MIN_PANEL_PX: number = 380;
// The panel never takes more than half the window, so the board always keeps the other half.
const MAX_PANEL_RATIO: number = 0.5;

// Drag the panel's left edge to resize it; double-click the edge to go back to the default width.
export class PanelResizer {
  constructor(handle: HTMLElement) {
    this.restore();
    handle.addEventListener('pointerdown', (event: PointerEvent): void => this.startDrag(handle, event));
    handle.addEventListener('dblclick', (): void => this.reset());
  }

  private startDrag(handle: HTMLElement, event: PointerEvent): void {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add(RESIZING_CLASS);
    const move = (moveEvent: PointerEvent): void => this.apply(window.innerWidth - moveEvent.clientX);
    const end = (): void => {
      handle.removeEventListener('pointermove', move);
      document.body.classList.remove(RESIZING_CLASS);
      this.save();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end, { once: true });
  }

  private apply(width: number): void {
    const max: number = Math.max(MIN_PANEL_PX, window.innerWidth * MAX_PANEL_RATIO);
    this.setWidth(Math.min(max, width));
  }

  // The half-window cap is also enforced in CSS, so a restored width is never clamped against a not-yet-sized window.
  private setWidth(width: number): void {
    document.body.style.setProperty(WIDTH_PROPERTY, `${Math.round(Math.max(MIN_PANEL_PX, width))}px`);
  }

  private reset(): void {
    document.body.style.removeProperty(WIDTH_PROPERTY);
    this.save();
  }

  // Storage can be unavailable; the panel then simply starts at its default width.
  private restore(): void {
    try {
      const saved: string | null = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) this.setWidth(Number(saved));
    } catch {
      // Default width.
    }
  }

  private save(): void {
    try {
      const width: string = document.body.style.getPropertyValue(WIDTH_PROPERTY);
      if (width.length === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(parseInt(width, 10)));
    } catch {
      // Width just will not persist.
    }
  }
}
