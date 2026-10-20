// The first timestamp in a chunk of transcript; nested ones inside a record only make the read go a little deeper.
const TIMESTAMP_FIELD: RegExp = /"timestamp":"([^"]+)"/;

// Whether a tail of a transcript reaches back to a moment, so reading further back is not needed.
export function reachesBack(text: string, moment: number): boolean {
  const match: RegExpExecArray | null = TIMESTAMP_FIELD.exec(text);
  if (match === null) return false;
  const time: number = Date.parse(match[1] ?? '');
  return !Number.isNaN(time) && time <= moment;
}
