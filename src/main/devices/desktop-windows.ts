import type { DesktopWindow } from '../../core/devices/desktop-window';
import { processStartedAt } from '../../core/process-start';
import { runCommand } from '../run-command';

interface HyprlandClient {
  readonly address: string;
  readonly pid: number;
  readonly class: string;
  readonly title: string;
  readonly focusHistoryID: number;
}

// The panel asks on every poll; windows rarely come and go faster than this, and hyprctl is a process spawn.
const WINDOW_LIST_TTL_MS: number = 3000;

// Hyprland's window list, shared by the device buttons: recent() for showing them, fresh() right before a focus.
export class DesktopWindowList {
  private cached: { readonly at: number; readonly windows: Promise<DesktopWindow[]> } | null = null;

  recent(): Promise<DesktopWindow[]> {
    const now: number = Date.now();
    if (this.cached !== null && now - this.cached.at < WINDOW_LIST_TTL_MS) return this.cached.windows;
    return this.fresh();
  }

  fresh(): Promise<DesktopWindow[]> {
    const windows: Promise<DesktopWindow[]> = listDesktopWindows().catch((): DesktopWindow[] => []);
    this.cached = { at: Date.now(), windows };
    return windows;
  }
}

// Moves to the window's workspace and focuses it, the way "Go to chat" does for a terminal.
export async function focusWindowAt(address: string): Promise<void> {
  await runCommand('hyprctl', ['dispatch', 'focuswindow', `address:${address}`]);
}

async function listDesktopWindows(): Promise<DesktopWindow[]> {
  const clients: HyprlandClient[] = JSON.parse(await runCommand('hyprctl', ['clients', '-j'])) as HyprlandClient[];
  return Promise.all(clients.map(toDesktopWindow));
}

async function toDesktopWindow(client: HyprlandClient): Promise<DesktopWindow> {
  return {
    address: client.address,
    pid: client.pid,
    className: client.class,
    title: client.title,
    focusHistoryId: client.focusHistoryID,
    startedAt: await processStartedAt(client.pid),
  };
}
