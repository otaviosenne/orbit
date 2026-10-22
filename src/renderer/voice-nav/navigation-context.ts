import type { VoiceCommandContext } from '../sheet/voice/commands/command-context';
import type { ViewName } from '../nav';
import { chatNumbers } from './chat-numbers';
import { showVoiceNotice } from './voice-notice';
import type { VoiceSelector } from './voice-selector';

export interface NavigationDeps {
  readonly setView: (view: ViewName) => void;
  // Opens the chat with its composer focused; false when it cannot be reached from this view.
  readonly openChat: (sessionId: string) => boolean;
  // Closes the side panel.
  readonly closePanel: () => void;
  // New chat and Resume, the popovers whose options have numbers.
  readonly selectors: readonly VoiceSelector[];
  // The open chat's Emulator or Browser pill; nothing when the chat has none.
  readonly openDevice: (device: 'emulator' | 'browser') => void;
  readonly openNewChat: () => void;
  readonly openResume: () => void;
}

// What spoken commands do to the app, built from the pieces app.ts already owns.
export function createNavigationContext(deps: NavigationDeps): VoiceCommandContext {
  const openSelector = (): VoiceSelector | undefined => deps.selectors.find((selector: VoiceSelector): boolean => selector.isOpen);
  return {
    setView: deps.setView,
    openChat: (number: number): boolean => {
      const sessionId: string | null = chatNumbers.sessionOf(number);
      return sessionId !== null && deps.openChat(sessionId);
    },
    openDevice: deps.openDevice,
    openNewChat: deps.openNewChat,
    openResume: deps.openResume,
    pick: (number: number): boolean => openSelector()?.pick(number) ?? false,
    close: (): void => {
      const selector: VoiceSelector | undefined = openSelector();
      if (selector === undefined) deps.closePanel();
      else selector.close();
    },
    isSelectorOpen: (): boolean => openSelector() !== undefined,
    report: showVoiceNotice,
  };
}
