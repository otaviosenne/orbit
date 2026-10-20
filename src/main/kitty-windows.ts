import { kittySocketPath } from './kitty-remote';
import { runCommand } from './run-command';

interface KittyProcess {
  readonly pid: number;
}

interface KittyWindow {
  readonly id: number;
  readonly pid: number;
  readonly foreground_processes: readonly KittyProcess[];
}

interface KittyTab {
  readonly windows: readonly KittyWindow[];
}

interface KittyOsWindow {
  readonly tabs: readonly KittyTab[];
}

// kitty's "pid:" match only knows the window's first process, and a chat often runs under a shell,
// so the window is found by the chat among its foreground processes and closed by id.
export async function closeKittyWindowOf(kittyPid: number, chatPid: number): Promise<void> {
  const target: string[] = ['@', '--to', `unix:${kittySocketPath(kittyPid)}`];
  const osWindows: KittyOsWindow[] = JSON.parse(await runCommand('kitty', [...target, 'ls'])) as KittyOsWindow[];
  const window: KittyWindow | undefined = osWindows
    .flatMap((osWindow: KittyOsWindow) => osWindow.tabs.flatMap((tab: KittyTab) => tab.windows))
    .find((candidate: KittyWindow) => runsChat(candidate, chatPid));
  if (window === undefined) throw new Error('Chat window not found in kitty');
  await runCommand('kitty', [...target, 'close-window', '--match', `id:${window.id}`]);
}

function runsChat(window: KittyWindow, chatPid: number): boolean {
  return window.pid === chatPid || window.foreground_processes.some((process: KittyProcess) => process.pid === chatPid);
}
