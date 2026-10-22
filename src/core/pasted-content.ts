// Claude Code records a pasted block of the user's message inside <pasted_content id="…">…</pasted_content id="…">
// (older versions without the id). The wrapper is bookkeeping, not what the user wrote: shown, it leaked into the
// bubble, and it kept Orbit's own copy of a sent message from ever matching the transcript, so it showed twice.
const PASTED_OPEN: RegExp = /<pasted_content(?:\s+id="[^"]*")?>\n?/g;
const PASTED_CLOSE: RegExp = /\n?<\/pasted_content(?:\s+id="[^"]*")?>/g;

export function withoutPastedWrappers(text: string): string {
  return text.replace(PASTED_OPEN, '').replace(PASTED_CLOSE, '');
}
