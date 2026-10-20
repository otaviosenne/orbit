// FLIP ("first, last, invert, play"): how far each element has to be pushed back so it starts where it was.
// Elements that appeared or left, or barely moved, get no offset.
export function flipOffsets(before: ReadonlyMap<string, number>, after: ReadonlyMap<string, number>, minPx: number): Map<string, number> {
  const offsets: Map<string, number> = new Map();
  after.forEach((top: number, key: string): void => {
    const previous: number | undefined = before.get(key);
    if (previous !== undefined && Math.abs(previous - top) >= minPx) offsets.set(key, previous - top);
  });
  return offsets;
}
