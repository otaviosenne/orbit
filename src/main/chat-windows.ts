import type { BrowserWindow, Event } from 'electron';
import { CHAT_WINDOW_QUERY_KEY } from '../shared/chat-window-query';
import { HUB_TITLE } from './window';
import { focusOwnWindow } from './own-window-focus';
import { createOrbitWindow, RENDERER_PAGE } from './window-base';

// About the size of the hub's chat panel, so a popped-out chat looks the same.
const CHAT_WIDTH: number = 560;
const CHAT_HEIGHT: number = 900;
// Never the hub's title: Hyprland pins windows titled exactly like the hub to workspace 2 when they map.
const PLACEHOLDER_TITLE: string = 'Chat — Orbit';

// One window per chat: opening a chat that already has a window brings that window back instead.
export class ChatWindows {
  private readonly windows: Map<string, BrowserWindow> = new Map();

  open(sessionId: string): void {
    const existing: BrowserWindow | undefined = this.windows.get(sessionId);
    if (existing !== undefined && !existing.isDestroyed()) return bringToFront(existing);
    this.windows.set(sessionId, this.create(sessionId));
  }

  private create(sessionId: string): BrowserWindow {
    const window: BrowserWindow = createOrbitWindow({ title: PLACEHOLDER_TITLE, width: CHAT_WIDTH, height: CHAT_HEIGHT });
    keepOffHubTitle(window);
    window.on('closed', (): void => {
      if (this.windows.get(sessionId) === window) this.windows.delete(sessionId);
    });
    void window.loadFile(RENDERER_PAGE, { query: { [CHAT_WINDOW_QUERY_KEY]: sessionId } });
    return window;
  }
}

// Outside Hyprland (or if hyprctl fails) Electron's own focus is the best there is.
function bringToFront(window: BrowserWindow): void {
  if (window.isMinimized()) window.restore();
  window.show();
  focusOwnWindow(window.getTitle())
    .then((focused: boolean): void => {
      if (!focused) window.focus();
    })
    .catch((): void => window.focus());
}

// index.html's <title> is the hub's; letting it through would make the window look like the hub to Hyprland.
function keepOffHubTitle(window: BrowserWindow): void {
  window.on('page-title-updated', (event: Event, title: string): void => {
    if (title === HUB_TITLE) event.preventDefault();
  });
}
