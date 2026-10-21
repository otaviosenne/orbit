import { stripSendCommand } from './send-command';

// After dictated words settle: a draft ending in the spoken send command loses the command and is sent, the same
// way the composer's Send button sends it (both composers send through their form).
export function sendOnVoiceCommand(input: HTMLTextAreaElement): boolean {
  const draft: string | null = stripSendCommand(input.value);
  if (draft === null || input.form === null) return false;
  input.value = draft;
  input.setSelectionRange(draft.length, draft.length);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.form.requestSubmit();
  return true;
}
