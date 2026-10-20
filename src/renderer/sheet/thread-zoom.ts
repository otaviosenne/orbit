const STORAGE_KEY: string = 'orbit.threadZoom';
const ZOOM_PROPERTY: string = '--thread-zoom';
const MIN_ZOOM: number = 0.8;
const MAX_ZOOM: number = 1.6;
const ZOOM_STEP: number = 0.05;
const DEFAULT_ZOOM: number = 1;
const ZOOM_DIGITS: number = 2;

interface ZoomAnchor {
  readonly item: HTMLElement;
  readonly fraction: number;
  readonly pointerY: number;
}

// Ctrl + mouse wheel over the chat panel makes the conversation text bigger or smaller; the size is remembered.
export class ThreadZoom {
  private zoom: number = readZoom();

  constructor(private readonly root: HTMLElement, private readonly thread: HTMLElement) {
    this.apply();
    // Not passive: the default Ctrl+wheel behaviour (zooming the whole page) must be stopped.
    root.addEventListener('wheel', (event: WheelEvent): void => this.handleWheel(event), { passive: false });
  }

  private handleWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const direction: number = event.deltaY < 0 ? 1 : -1;
    const next: number = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom + direction * ZOOM_STEP));
    if (next === this.zoom) return;
    const anchor: ZoomAnchor | null = this.anchorAt(event.clientY);
    this.zoom = next;
    this.apply();
    if (anchor !== null) this.restore(anchor);
    writeZoom(this.zoom);
  }

  // The item under the pointer, and where in it the pointer is: that spot stays put while the text resizes.
  private anchorAt(pointerY: number): ZoomAnchor | null {
    const item: HTMLElement | undefined = [...this.thread.children].find((child: Element): child is HTMLElement => {
      const rect: DOMRect = child.getBoundingClientRect();
      return child instanceof HTMLElement && rect.top <= pointerY && rect.bottom >= pointerY;
    });
    if (item === undefined) return null;
    const rect: DOMRect = item.getBoundingClientRect();
    return { item, fraction: rect.height === 0 ? 0 : (pointerY - rect.top) / rect.height, pointerY };
  }

  private restore(anchor: ZoomAnchor): void {
    const rect: DOMRect = anchor.item.getBoundingClientRect();
    const spotNow: number = rect.top + anchor.fraction * rect.height;
    this.thread.scrollTop += spotNow - anchor.pointerY;
  }

  private apply(): void {
    this.root.style.setProperty(ZOOM_PROPERTY, this.zoom.toFixed(ZOOM_DIGITS));
  }
}

function readZoom(): number {
  try {
    const saved: number = Number(localStorage.getItem(STORAGE_KEY));
    return saved >= MIN_ZOOM && saved <= MAX_ZOOM ? saved : DEFAULT_ZOOM;
  } catch {
    return DEFAULT_ZOOM;
  }
}

function writeZoom(zoom: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, zoom.toFixed(ZOOM_DIGITS));
  } catch {
    // Size just is not remembered.
  }
}
