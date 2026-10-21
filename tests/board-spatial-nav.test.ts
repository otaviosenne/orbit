import { describe, expect, it } from 'vitest';
import type { FocusCandidate } from '../src/renderer/board/spatial-nav';
import { firstInReadingOrder, nextInDirection } from '../src/renderer/board/spatial-nav';

const CARD_WIDTH: number = 200;
const CARD_HEIGHT: number = 60;

function card(key: string, left: number, top: number): FocusCandidate {
  return { key, box: { left, top, right: left + CARD_WIDTH, bottom: top + CARD_HEIGHT }, area: key.startsWith('pinned') ? 'pinned' : 'board' };
}

// Pinned row on top; then Needs you (2 cards), Working (1 card, lower) and Active over Idle.
const BOARD: readonly FocusCandidate[] = [
  card('pinned:a', 0, 0),
  card('pinned:b', 210, 0),
  card('needs:1', 0, 100),
  card('needs:2', 0, 170),
  card('busy:1', 300, 240),
  card('active:1', 600, 100),
  card('idle:1', 600, 300),
];

function candidate(key: string): FocusCandidate {
  const found: FocusCandidate | undefined = BOARD.find((entry: FocusCandidate) => entry.key === key);
  if (found === undefined) throw new Error(key);
  return found;
}

function step(from: string, direction: 'up' | 'down' | 'left' | 'right'): string | null {
  return nextInDirection(candidate(from), BOARD, direction)?.key ?? null;
}

describe('board focus moves', () => {
  it('starts at the top-left card', () => {
    expect(firstInReadingOrder(BOARD)?.key).toBe('pinned:a');
    expect(firstInReadingOrder([])).toBeNull();
  });

  it('steps up and down inside a column, Active into Idle', () => {
    expect(step('needs:1', 'down')).toBe('needs:2');
    expect(step('needs:2', 'up')).toBe('needs:1');
    expect(step('active:1', 'down')).toBe('idle:1');
    expect(step('needs:2', 'down')).toBeNull();
  });

  it('goes to the next column even when its card sits lower, then to the card closest in height', () => {
    expect(step('needs:1', 'right')).toBe('busy:1');
    expect(step('busy:1', 'right')).toBe('idle:1');
    expect(step('active:1', 'left')).toBe('busy:1');
    expect(step('idle:1', 'right')).toBeNull();
  });

  it('moves along the Pinned row and from a column up into it', () => {
    expect(step('pinned:a', 'right')).toBe('pinned:b');
    expect(step('needs:1', 'up')).toBe('pinned:a');
    expect(step('pinned:a', 'down')).toBe('needs:1');
  });
});
