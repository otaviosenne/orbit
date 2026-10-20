// Answers which terminal window the user is looking at; implemented with Hyprland in the main process.
export interface WindowLocator {
  activeWindowPid(): Promise<number | null>;
  windowPidOf(chatPid: number): Promise<number | null>;
}
