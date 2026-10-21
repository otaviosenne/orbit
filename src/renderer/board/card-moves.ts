// FLIP ("first, last, invert, play") for board cards, in two dimensions: cards move across columns as well
// as up and down inside one.
export interface CardBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface CardMove {
  readonly key: string;
  readonly from: CardBox;
  readonly to: CardBox;
}

export type CardBoxes = ReadonlyMap<string, CardBox>;

// Cards that are on the board both times and shifted far enough to be a move rather than rounding.
export function cardMoves(before: CardBoxes, after: CardBoxes, minPx: number): CardMove[] {
  const moves: CardMove[] = [];
  after.forEach((to: CardBox, key: string): void => {
    const from: CardBox | undefined = before.get(key);
    if (from !== undefined && hasMoved(from, to, minPx)) moves.push({ key, from, to });
  });
  return moves;
}

function hasMoved(from: CardBox, to: CardBox, minPx: number): boolean {
  return Math.abs(from.left - to.left) >= minPx || Math.abs(from.top - to.top) >= minPx;
}

// Cards that were not on the board before: they fade in instead of flying from somewhere.
export function enteringCards(before: CardBoxes, after: CardBoxes): string[] {
  return [...after.keys()].filter((key: string) => !before.has(key));
}

// Where each card was last seen: a card still flying, or one just dropped, is where the eye left it, not
// where its slot was.
export function seenBoxes(slots: CardBoxes, overrides: CardBoxes): Map<string, CardBox> {
  return new Map([...slots, ...overrides]);
}
