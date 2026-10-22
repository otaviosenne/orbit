import type { VoiceCommandContext } from './commands/command-context';
import { voiceCommandContext } from './commands/command-context';
import { executeNavigation } from './commands/command-executor';
import { parseVoiceCommand } from './commands/command-parser';
import type { SpokenCommand } from './commands/voice-command';

// After dictated words settle: a draft ending in a spoken command loses the phrase, then the command acts. Send
// submits the draft the way the composer's Send button does (both composers send through their form); clear empties
// it. The phrase is always removed first, announced to the composer as the input event an edit would be, so hands-free
// (which calls this on every update of the live words) never sees it again and a command acts once.
// isFinal: false for live words that may still grow.
export function runVoiceCommand(input: HTMLTextAreaElement, isFinal: boolean): boolean {
  const context: VoiceCommandContext | null = voiceCommandContext();
  const spoken: SpokenCommand | null = parseVoiceCommand(input.value, { isSelectorOpen: context?.isSelectorOpen() ?? false, isFinal });
  if (spoken === null) return false;
  if (spoken.command.action === 'clear') return replaceDraft(input, '');
  if (spoken.command.action === 'send') return sendDraft(input, spoken.remainder);
  if (context === null) return false;
  replaceDraft(input, spoken.remainder);
  executeNavigation(spoken.command, context);
  return true;
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
