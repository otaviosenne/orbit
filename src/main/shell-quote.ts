const SINGLE_QUOTE: string = "'";
// Inside single quotes nothing is special except the quote itself, which has to close, be escaped, and reopen.
const ESCAPED_SINGLE_QUOTE: string = `'\\''`;

// Makes a value one literal word for a POSIX shell, whatever characters it holds.
export function shellQuote(value: string): string {
  return `${SINGLE_QUOTE}${value.split(SINGLE_QUOTE).join(ESCAPED_SINGLE_QUOTE)}${SINGLE_QUOTE}`;
}
