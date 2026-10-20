import { BrowserWindow, shell } from 'electron';
import type { BrowserWindowConstructorOptions } from 'electron';
import { join } from 'node:path';

export const MIN_WIDTH: number = 360;
export const MIN_HEIGHT: number = 300;
const TRANSPARENT: string = '#00000000';
const EXTERNAL_PROTOCOLS: readonly string[] = ['http:', 'https:'];

export const RENDERER_PAGE: string = join(__dirname, 'renderer', 'index.html');

// Frameless and transparent so Hyprland's blur shows through the glass background; every Orbit window shares this.
export function createOrbitWindow(options: BrowserWindowConstructorOptions): BrowserWindow {
  const window: BrowserWindow = new BrowserWindow({
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    frame: false,
    transparent: true,
    backgroundColor: TRANSPARENT,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
    ...options,
  });
  keepLinksOutside(window);
  return window;
}

// Links inside chat messages open in the browser; an Orbit window itself never navigates away.
function keepLinksOutside(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    openIfWeb(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url: string): void => {
    event.preventDefault();
    openIfWeb(url);
  });
}

function openIfWeb(url: string): void {
  if (EXTERNAL_PROTOCOLS.includes(new URL(url).protocol)) void shell.openExternal(url);
}
