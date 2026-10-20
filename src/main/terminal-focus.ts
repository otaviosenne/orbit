import { findTerminalWindowPid, focusWindow } from './terminal-window';

// Switches Hyprland to the chat's workspace and focuses its kitty window.
export async function focusTerminalOf(chatPid: number): Promise<void> {
  const windowPid: number | null = await findTerminalWindowPid(chatPid);
  if (windowPid !== null) await focusWindow(windowPid);
}
