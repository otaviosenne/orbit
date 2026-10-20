import { runCommand } from './run-command';

// Hyprland starts the program itself, so it gets the compositor's clean environment instead of Orbit's:
// a chat that inherits CLAUDE_CODE_* markers from whoever launched Orbit silently stops saving its transcript.
export async function launchThroughHyprland(shellCommand: string): Promise<void> {
  await runCommand('hyprctl', ['dispatch', 'exec', shellCommand]);
}

// Puts the window on that workspace without switching to it, so the user stays where they are.
export function silentlyOnWorkspace(workspace: number, shellCommand: string): string {
  return `[workspace ${workspace} silent] ${shellCommand}`;
}
