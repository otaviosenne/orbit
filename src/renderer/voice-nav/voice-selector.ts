// A popover whose options can be picked by number: New chat's project menu, Resume's list.
export interface VoiceSelector {
  readonly isOpen: boolean;
  // Picks option N (counted from 1); false when there is no such option.
  pick(number: number): boolean;
  close(): void;
}
