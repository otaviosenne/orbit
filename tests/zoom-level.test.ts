import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TILE_ZOOM,
  MAX_TILE_ZOOM,
  MIN_TILE_ZOOM,
  clampZoom,
  parseZoom,
  stepZoom,
  zoomPercent,
} from '../src/renderer/views/grid/zoom-level';

describe('zoom level', () => {
  it('steps up and down and lands on clean values', () => {
    expect(stepZoom(0.9, 1, 0.1)).toBe(1);
    expect(stepZoom(0.9, -1, 0.05)).toBe(0.85);
  });

  it('stays within its limits', () => {
    expect(stepZoom(MAX_TILE_ZOOM, 1, 0.1)).toBe(MAX_TILE_ZOOM);
    expect(stepZoom(MIN_TILE_ZOOM, -1, 0.1)).toBe(MIN_TILE_ZOOM);
    expect(clampZoom(5)).toBe(MAX_TILE_ZOOM);
  });

  it('reads a stored size and falls back for anything else', () => {
    expect(parseZoom('1.20')).toBe(1.2);
    expect(parseZoom(null)).toBe(DEFAULT_TILE_ZOOM);
    expect(parseZoom('')).toBe(DEFAULT_TILE_ZOOM);
    expect(parseZoom('big')).toBe(DEFAULT_TILE_ZOOM);
    expect(parseZoom('3')).toBe(DEFAULT_TILE_ZOOM);
  });

  it('shows the size as a percentage', () => {
    expect(zoomPercent(0.9)).toBe('90%');
  });
});
