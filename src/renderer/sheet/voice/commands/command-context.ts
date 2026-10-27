import type { ViewName } from '../../../nav';

// What a spoken command can do to the app; the renderer's app.ts supplies it.
export interface VoiceCommandContext {
  setView(view: ViewName): void;
  // Opens chat N in the side panel (or focuses its tile in the Panel) with its composer focused; false for an unknown number.
  openChat(number: number): boolean;
  // Goes to the open chat's emulator window or browser tab; does nothing when it has none.
  openDevice(device: 'emulator' | 'browser'): void;
  openNewChat(): void;
  openResume(): void;
  // Picks option N of the open selector; false for an unknown number.
  pick(number: number): boolean;
  // Closes the open selector, or else the side panel.
  close(): void;
  // The chat being talked to: the open panel's, or the Panel tile that has the cursor. Suspending asks first when it is working.
  suspendChat(): void;
  pinChat(pinned: boolean): void;
  isSelectorOpen(): boolean;
  report(message: string): void;
}

let installed: VoiceCommandContext | null = null;

export function installVoiceCommandContext(context: VoiceCommandContext): void {
  installed = context;
}

export function voiceCommandContext(): VoiceCommandContext | null {
  return installed;
}
