// Shortens long text while saying how much was left out, so a clipped tool output is never mistaken for the whole.
export function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n… ${text.length - maxChars} more characters`;
}

export function firstLine(text: string, maxChars: number): string {
  const line: string = text.trim().split('\n')[0] ?? '';
  return line.length > maxChars ? `${line.slice(0, maxChars)}…` : line;
}
