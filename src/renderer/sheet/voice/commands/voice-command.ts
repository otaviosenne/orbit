import type { ViewName } from '../../../nav';

// What a spoken phrase at the end of the dictated words asks for. A number is "chat N": it opens chat N, or picks
// option N while a selector (New chat, Resume) is open.
export type VoiceCommand =
  | { readonly action: 'send' }
  | { readonly action: 'clear' }
  | { readonly action: 'view'; readonly view: ViewName }
  | { readonly action: 'choose'; readonly number: number }
  | { readonly action: 'device'; readonly device: 'emulator' | 'browser' }
  | { readonly action: 'new-chat' }
  | { readonly action: 'resume' }
  | { readonly action: 'cancel' };

export interface SpokenCommand {
  readonly command: VoiceCommand;
  // The draft with the spoken phrase taken off its end.
  readonly remainder: string;
  // Set when the command acts only after this long with no change to the draft.
  readonly afterPauseMs?: number;
}

export interface ParseOptions {
  // A selector is open: a bare number picks one of its options.
  readonly isSelectorOpen: boolean;
  // The words will not change any more. Live words can still grow ("vinte" into "vinte e um").
  readonly isFinal: boolean;
}
