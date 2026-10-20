import type { BrowserWindow } from 'electron';
import { createOrbitWindow, RENDERER_PAGE } from './window-base';

// The Hyprland rule that pins the hub to workspace 2 matches this exact title, so it must hold from the first frame.
export const HUB_TITLE: string = 'Orbit';

export function createRadarWindow(): BrowserWindow {
  const window: BrowserWindow = createOrbitWindow({ title: HUB_TITLE });
  void window.loadFile(RENDERER_PAGE);
  return window;
}
