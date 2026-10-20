import { runCommand } from './run-command';

interface HyprlandWindow {
  readonly pid: number;
  readonly title: string;
  readonly address: string;
}

// Electron's focus() only requests Wayland activation, which Hyprland turns into an urgency hint rather than
// a focus change. Every Orbit window shares this process's pid, so the title tells them apart.
export async function focusOwnWindow(title: string): Promise<boolean> {
  const windows: HyprlandWindow[] = JSON.parse(await runCommand('hyprctl', ['clients', '-j'])) as HyprlandWindow[];
  const target: HyprlandWindow | undefined = windows.find(
    (candidate: HyprlandWindow) => candidate.pid === process.pid && candidate.title === title,
  );
  if (target === undefined) return false;
  await runCommand('hyprctl', ['dispatch', 'focuswindow', `address:${target.address}`]);
  return true;
}
