// Text size of the tiles' transcripts, as a CSS zoom factor. Tiles are small, so the default reads a step
// below the chat panel's 100%.
export const MIN_TILE_ZOOM: number = 0.6;
export const MAX_TILE_ZOOM: number = 1.4;
export const DEFAULT_TILE_ZOOM: number = 0.9;
// The − / + buttons take bigger steps than one notch of Ctrl + wheel.
export const BUTTON_ZOOM_STEP: number = 0.1;
export const WHEEL_ZOOM_STEP: number = 0.05;
const ZOOM_DIGITS: number = 2;
const PERCENT: number = 100;

// Rounded so repeated steps land on clean values (0.9, not 0.8999999).
export function clampZoom(zoom: number): number {
  const clamped: number = Math.min(MAX_TILE_ZOOM, Math.max(MIN_TILE_ZOOM, zoom));
  return Number(clamped.toFixed(ZOOM_DIGITS));
}

export function stepZoom(zoom: number, direction: 1 | -1, step: number): number {
  return clampZoom(zoom + direction * step);
}

// A stored value that is missing, not a number or out of range falls back to the default.
export function parseZoom(raw: string | null): number {
  const zoom: number = Number(raw);
  return raw !== null && Number.isFinite(zoom) && zoom >= MIN_TILE_ZOOM && zoom <= MAX_TILE_ZOOM ? zoom : DEFAULT_TILE_ZOOM;
}

export function formatZoom(zoom: number): string {
  return zoom.toFixed(ZOOM_DIGITS);
}

export function zoomPercent(zoom: number): string {
  return `${Math.round(zoom * PERCENT)}%`;
}
