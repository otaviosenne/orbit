// "Orbit mute" keeps the microphone on but stops listening to anything except "Orbit unmute"; only a spoken command
// changes it, so a hand on the keyboard never unmutes by accident. One state for the whole window, like the mic.
type MuteListener = (muted: boolean) => void;

let muted: boolean = false;
const listeners: Set<MuteListener> = new Set();
// Mute belongs to the always-on mic: said into a held-Space dictation it would only leave the next start muted.
let canMute: () => boolean = (): boolean => true;

export function onlyMuteWhile(condition: () => boolean): void {
  canMute = condition;
}

export function isVoiceMuted(): boolean {
  return muted;
}

export function setVoiceMuted(next: boolean): void {
  if (next === muted || (next && !canMute())) return;
  muted = next;
  for (const listener of listeners) listener(muted);
}

export function onVoiceMuteChange(listener: MuteListener): void {
  listeners.add(listener);
}
