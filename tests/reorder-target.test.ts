import { describe, expect, it } from 'vitest';
import { CardOrder } from '../src/renderer/board/card-order';
import { moveInOrder, reorderTarget, type ReorderCandidate } from '../src/renderer/board/reorder-target';

const box = (left: number, top: number, size: number): ReorderCandidate['box'] => ({ left, top, right: left + size, bottom: top + size });

describe('reorderTarget', () => {
  const column: ReorderCandidate[] = [{ sessionId: 'a', box: box(0, 0, 100) }, { sessionId: 'b', box: box(0, 110, 100) }];

  it('puts the card before the nearest one when the pointer is in its upper half, after otherwise', () => {
    expect(reorderTarget(column, 50, 20, 'vertical')).toEqual({ sessionId: 'a', placement: 'before' });
    expect(reorderTarget(column, 50, 170, 'vertical')).toEqual({ sessionId: 'b', placement: 'after' });
  });

  it('reads a wrapping row sideways', () => {
    const row: ReorderCandidate[] = [{ sessionId: 'a', box: box(0, 0, 100) }, { sessionId: 'b', box: box(110, 0, 100) }];
    expect(reorderTarget(row, 130, 50, 'horizontal')).toEqual({ sessionId: 'b', placement: 'before' });
    expect(reorderTarget(row, 400, 50, 'horizontal')).toEqual({ sessionId: 'b', placement: 'after' });
  });

  it('has no target in an empty section', () => {
    expect(reorderTarget([], 5, 5, 'vertical')).toBeNull();
  });
});

describe('moveInOrder', () => {
  it('moves a card next to the target on either side', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'a', { sessionId: 'c', placement: 'after' })).toEqual(['b', 'c', 'a']);
    expect(moveInOrder(['a', 'b', 'c'], 'c', { sessionId: 'a', placement: 'before' })).toEqual(['c', 'a', 'b']);
  });

  it('leaves the order alone for an unknown target', () => {
    expect(moveInOrder(['a', 'b'], 'a', { sessionId: 'x', placement: 'before' })).toEqual(['a', 'b']);
  });
});

describe('CardOrder', () => {
  it('shows the saved order, with chats it has not seen first', () => {
    const order: CardOrder = new CardOrder();
    order.set('idle', ['c', 'a']);
    const shown = order.apply('idle', [{ sessionId: 'a' }, { sessionId: 'b' }, { sessionId: 'c' }]);
    expect(shown.map((chat) => chat.sessionId)).toEqual(['b', 'c', 'a']);
  });
});
