import { launchThroughHyprland, silentlyOnWorkspace } from './hyprland-exec';

// Bound to the right monitor in ~/.config/hypr/config.d/01-monitors.conf.
export const CHAT_WORKSPACE: number = 99;

// New and resumed chats wait on their own workspace instead of pulling the user away from what they are doing.
export function launchChatInBackground(shellCommand: string): Promise<void> {
  return launchThroughHyprland(silentlyOnWorkspace(CHAT_WORKSPACE, shellCommand));
}
