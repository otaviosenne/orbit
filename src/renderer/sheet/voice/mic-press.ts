export type MicPress = 'turn-on' | 'turn-off' | 'ignore';

// The mic button works like a double tap of Space: it keeps the microphone on hands-free, and turns it off again.
// While the last hands-free words are still being refined the microphone is not free to reopen yet.
export function micPress(isHandsFreeOn: boolean, isHandsFreeBusy: boolean): MicPress {
  if (isHandsFreeOn) return 'turn-off';
  return isHandsFreeBusy ? 'ignore' : 'turn-on';
}
