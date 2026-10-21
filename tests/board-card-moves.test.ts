import { describe, expect, it } from 'vitest';
import { cardKeyFor, landingCardKey } from '../src/renderer/board/card-keys';
import type { CardBox, CardMove } from '../src/renderer/board/card-moves';
import { cardMoves, enteringCards, seenBoxes } from '../src/renderer/board/card-moves';

const MIN_PX: number = 1;
const CARD_WIDTH: number = 240;
const CARD_HEIGHT: number = 70;

function box(left: number, top: number): CardBox {
  return { left, top, width: CARD_WIDTH, height: CARD_HEIGHT };
}

describe('cardMoves', () => {
  it('flies a card that changed column from its old box to its new one', () => {
    const before: Map<string, CardBox> = new Map([['board:a', box(0, 100)]]);
    const after: Map<string, CardBox> = new Map([['board:a', box(600, 40)]]);
    expect(cardMoves(before, after, MIN_PX)).toEqual<CardMove[]>([{ key: 'board:a', from: box(0, 100), to: box(600, 40) }]);
  });

  it('moves cards that swapped places inside one column', () => {
    const before: Map<string, CardBox> = new Map([['board:a', box(0, 0)], ['board:b', box(0, 80)]]);
    const after: Map<string, CardBox> = new Map([['board:a', box(0, 80)], ['board:b', box(0, 0)]]);
    expect(cardMoves(before, after, MIN_PX).map((move: CardMove) => move.key)).toEqual(['board:a', 'board:b']);
  });

  it('leaves alone a poll where nothing moved, or only shifted by rounding', () => {
    const before: Map<string, CardBox> = new Map([['board:a', box(0, 0)], ['board:b', box(300, 80)]]);
    const after: Map<string, CardBox> = new Map([['board:a', box(0.4, 0)], ['board:b', box(300, 80.3)]]);
    expect(cardMoves(before, after, MIN_PX)).toEqual([]);
  });

  it('does not fly cards that appeared or left', () => {
    const before: Map<string, CardBox> = new Map([['board:gone', box(0, 0)]]);
    const after: Map<string, CardBox> = new Map([['board:new', box(0, 0)]]);
    expect(cardMoves(before, after, MIN_PX)).toEqual([]);
  });
});

describe('enteringCards', () => {
  it('lists only the cards that are new on the board', () => {
    const before: Map<string, CardBox> = new Map([['board:a', box(0, 0)]]);
    const after: Map<string, CardBox> = new Map([['board:a', box(0, 80)], ['pinned:a', box(0, 0)]]);
    expect(enteringCards(before, after)).toEqual(['pinned:a']);
  });
});

describe('seenBoxes', () => {
  it('prefers where a flying or dropped card was seen over its slot', () => {
    const slots: Map<string, CardBox> = new Map([['board:a', box(0, 0)], ['board:b', box(0, 80)]]);
    const seen: Map<string, CardBox> = seenBoxes(slots, new Map([['board:a', box(420, 300)]]));
    expect(seen.get('board:a')).toEqual(box(420, 300));
    expect(seen.get('board:b')).toEqual(box(0, 80));
  });
});

describe('landingCardKey', () => {
  it('lands the new Pinned copy for a pin, the column card for an unpin or a rest', () => {
    expect(landingCardKey('a', { kind: 'pin' })).toBe(cardKeyFor('pinned', 'a'));
    expect(landingCardKey('a', { kind: 'unpin' })).toBe(cardKeyFor('board', 'a'));
    expect(landingCardKey('a', { kind: 'rest', column: 'idle' })).toBe(cardKeyFor('board', 'a'));
    expect(landingCardKey('a', { kind: 'none' })).toBeNull();
  });
});
