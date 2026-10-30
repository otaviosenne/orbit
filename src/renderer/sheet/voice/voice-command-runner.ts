import type { VoiceCommandContext } from './commands/command-context';
import { voiceCommandContext } from './commands/command-context';
import { executeNavigation } from './commands/command-executor';
import { parseVoiceCommand, pausedSendText } from './commands/command-parser';
import type { SpokenCommand } from './commands/voice-command';
import { actAfterPause, cancelPause } from './pause-send';
import { setVoiceMuted } from './voice-mute';

// After dictated words settle: a draft ending in a spoken command loses the phrase, then the command acts. Send
// submits the draft the way the composer's Send button does (both composers send through their form); clear empties
// it. The phrase is always removed first, announced to the composer as the input event an edit would be, so hands-free
// (which calls this on every update of the live words) never sees it again and a command acts once.
// A command that waits for a pause leaves its words in the draft until it acts, so more speech after them loses nothing.
// isFinal: false for live words that may still grow.
export function runVoiceCommand(input: HTMLTextAreaElement, isFinal: boolean): boolean {
  const context: VoiceCommandContext | null = voiceCommandContext();
  const spoken: SpokenCommand | null = parseVoiceCommand(input.value, { isSelectorOpen: context?.isSelectorOpen() ?? false, isFinal });
  if (spoken?.afterPauseMs !== undefined) return waitThenSend(input, spoken.afterPauseMs);
  cancelPause(input);
  if (spoken === null) return false;
  if (spoken.command.action === 'clear') return replaceDraft(input, '');
  if (spoken.command.action === 'send') return sendDraft(input, spoken.remainder);
  if (spoken.command.action === 'mute' || spoken.command.action === 'unmute') return setMute(input, spoken.remainder, spoken.command.action === 'mute');
  if (context === null) return false;
  replaceDraft(input, spoken.remainder);
  executeNavigation(spoken.command, context);
  return true;
}

// While muted, hands-free writes into a scratch field that nobody sees, and only "Orbit unmute" is heard there: no
// send, no navigation, nothing else said reaches the app.
export function runMutedVoiceCommand(input: HTMLTextAreaElement, isFinal: boolean): boolean {
  const spoken: SpokenCommand | null = parseVoiceCommand(input.value, { isSelectorOpen: false, isFinal });
  if (spoken?.command.action !== 'unmute') return false;
  return setMute(input, '', false);
}

// The phrase comes off first, so the draft keeps only what was said before it.
function setMute(input: HTMLTextAreaElement, remainder: string, muted: boolean): boolean {
  replaceDraft(input, remainder);
  setVoiceMuted(muted);
  return true;
}

// Nothing happens now. After the pause the draft is read again, so the words taken off are the ones it ends with then.
function waitThenSend(input: HTMLTextAreaElement, afterMs: number): boolean {
  actAfterPause(input, afterMs, (): void => {
    const text: string | null = pausedSendText(input.value);
    if (text !== null) sendDraft(input, text);
  });
  return false;
}

function sendDraft(input: HTMLTextAreaElement, text: string): boolean {
  if (input.form === null) return false;
  replaceDraft(input, text);
  input.form.requestSubmit();
  return true;
}

function replaceDraft(input: HTMLTextAreaElement, text: string): boolean {
  input.value = text;
  input.setSelectionRange(text.length, text.length);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}
