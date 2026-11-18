import type { TypingAnswer, TypingField, TypingRequest } from './typing-request';

// Typed into the chat's terminal as the user's next message: what happened and to which fields, never what was typed.
export function typingReply(request: TypingRequest, answer: TypingAnswer): string {
  const labels: string = labelList(request.fields);
  if (answer === 'decline') return `Declined in Orbit: the user did not type ${labels}.`;
  const enter: string = answer.pressEnter ? ' and pressed Enter after the last one' : '';
  return `Typed in Orbit: the user typed ${labels} ${placement(request.fields.length)}${enter}. You never get the text.`;
}

function placement(fieldCount: number): string {
  return fieldCount === 1 ? 'into the focused field' : `into the focused field and the ${fieldCount - 1} after it, with Tab between them`;
}

// "A", "A and B", "A, B and C": the labels in the order they were typed.
function labelList(fields: readonly TypingField[]): string {
  const quoted: string[] = fields.map((field: TypingField): string => `"${field.label}"`);
  const last: string | undefined = quoted.pop();
  return quoted.length === 0 ? (last ?? '') : `${quoted.join(', ')} and ${last ?? ''}`;
}
