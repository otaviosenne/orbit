import type { TypingField, TypingRequest } from './typing-request';
import { remainingFields } from './typing-request';

// Typed into the chat's terminal as the user's next message: which field is on the clipboard, never what it holds.
// request is the one after the copy, so what is left to copy is already up to date.
export function copiedReply(request: TypingRequest, field: number): string {
  const copied: string = `Copied in Orbit: "${request.fields[field]?.label ?? ''}" is on the PC's clipboard.`;
  // Orbit itself may hold the keyboard after the user's click, and a Wayland window sees the new clipboard only once
  // it has real focus, so the paste must start by focusing the target window.
  const paste: string =
    'Paste it now: give the target window real keyboard focus on the PC (hyprctl dispatch focuswindow), click its ' +
    'field and press ctrl+v; you never get the text.';
  return `${copied} ${paste} ${whatIsNext(remainingFields(request))}`;
}

export function declinedReply(request: TypingRequest): string {
  return `Declined in Orbit: the user did not copy ${labelList(remainingFields(request))}.`;
}

function whatIsNext(remaining: readonly TypingField[]): string {
  if (remaining.length === 0) return 'That was the last field.';
  return `Then end your turn and wait for the next "Copied" message; still to copy: ${labelList(remaining)}.`;
}

// "A", "A and B", "A, B and C": the labels in the order the chat listed them.
function labelList(fields: readonly TypingField[]): string {
  const quoted: string[] = fields.map((field: TypingField): string => `"${field.label}"`);
  const last: string | undefined = quoted.pop();
  return quoted.length === 0 ? (last ?? '') : `${quoted.join(', ')} and ${last ?? ''}`;
}
