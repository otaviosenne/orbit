import type { VoiceCommand } from './send-command';
import { voiceCommandOf } from './send-command';

// After dictated words settle: a draft ending in the spoken send command loses the command and is sent, the same
// way the composer's Send button sends it (both composers send through their form); one ending in the clear command
// is emptied. Either is announced to the composer as the input event an edit would be.
export function sendOnVoiceCommand(input: HTMLTextAreaElement): boolean {
  const command: VoiceCommand | null = voiceCommandOf(input.value);
  if (command === null) return false;
  if (command.action === 'clear') return replaceDraft(input, '');
  if (input.form === null) return false;
  replaceDraft(input, command.text);
  input.form.requestSubmit();
  return true;
}

function replaceDraft(input: HTMLTextAreaElement, text: string): boolean {
  input.value = text;
  input.setSelectionRange(text.length, text.length);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}
