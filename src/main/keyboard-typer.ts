import { delay, runCommand } from './run-command';
import type { WindowPlacement } from './terminal-window';
import { focusWindow, windowPlacement } from './terminal-window';

const FOCUS_SETTLE_MS: number = 200;
const RADAR_WINDOW: string = 'class:claude-radar';

// Fallback for kitty windows opened before remote control was enabled: focus, type, then put the screen back.
export async function typeIntoWindow(windowPid: number, text: string): Promise<void> {
  const placement: WindowPlacement | null = await windowPlacement(windowPid);
  await focusWindow(windowPid);
  await delay(FOCUS_SETTLE_MS);
  await runCommand('wtype', ['-M', 'ctrl', '-k', 'u', '-m', 'ctrl']);
  // Typing a newline would submit early, so multi-line text is flattened.
  await runCommand('wtype', [text.replace(/\s*\n\s*/g, ' ')]);
  await runCommand('wtype', ['-k', 'Return']);
  await restoreScreen(placement);
}

// Switches the chat's monitor back to what it showed before, then returns focus to the radar.
async function restoreScreen(placement: WindowPlacement | null): Promise<void> {
  // Re-dispatching the workspace already shown could trigger Hyprland's back-and-forth, so only switch if it changed.
  if (placement !== null && placement.visibleWorkspace !== placement.workspace) {
    await runCommand('hyprctl', ['dispatch', 'workspace', String(placement.visibleWorkspace)]);
  }
  await runCommand('hyprctl', ['dispatch', 'focuswindow', RADAR_WINDOW]);
}
