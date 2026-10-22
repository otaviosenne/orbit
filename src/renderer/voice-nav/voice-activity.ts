// The number badges show only while voice can hear a command: hands-free on, or Space held to talk.
const ACTIVE_ATTRIBUTE: string = 'voiceActive';

export function setVoiceActive(isActive: boolean): void {
  if (isActive) document.documentElement.dataset[ACTIVE_ATTRIBUTE] = 'true';
  else delete document.documentElement.dataset[ACTIVE_ATTRIBUTE];
}
