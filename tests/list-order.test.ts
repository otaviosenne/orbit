import { describe, expect, it } from 'vitest';
import type { OrderedChat } from '../src/renderer/views/list/list-order';
import { alphabeticalOrder, listOrder, mergeManualOrder, moveItem } from '../src/renderer/views/list/list-order';
import { parseListSortMode } from '../src/renderer/views/list/list-sort-mode';
import { parseManualOrder } from '../src/renderer/views/list/manual-order-store';

function chat(sessionId: string, name: string = sessionId, startedAt: number = 0): OrderedChat {
  return { sessionId, name, startedAt };
}

describe('alphabetical order', () => {
  it('ignores case and accents', () => {
    const chats: OrderedChat[] = [chat('z', 'zebra'), chat('e', 'Éclair'), chat('a', 'apple'), chat('b', 'Banana')];
    expect(alphabeticalOrder(chats)).toEqual(['a', 'b', 'e', 'z']);
  });

  it('breaks ties the same way every time, so equal names never swap between polls', () => {
    const chats: OrderedChat[] = [chat('2', 'Orbit'), chat('1', 'orbit'), chat('3', 'Orbit')];
    expect(alphabeticalOrder(chats)).toEqual(alphabeticalOrder([...chats].reverse()));
    expect(alphabeticalOrder(chats)).toEqual(['1', '2', '3']);
  });
});

describe('merging the saved manual order with the open chats', () => {
  it('keeps the saved order for chats that are still open', () => {
    expect(mergeManualOrder(['c', 'a', 'b'], [chat('a'), chat('b'), chat('c')])).toEqual(['c', 'a', 'b']);
  });

  it('drops closed chats', () => {
    expect(mergeManualOrder(['c', 'gone', 'a'], [chat('a'), chat('c')])).toEqual(['c', 'a']);
  });

  it('puts a new chat last, even when A–Z would put it first', () => {
    const chats: OrderedChat[] = [chat('b', 'Bravo', 1), chat('new', 'Alpha', 3), chat('a', 'Charlie', 2)];
    expect(mergeManualOrder(['b', 'a'], chats)).toEqual(['b', 'a', 'new']);
  });

  it('puts several new chats last in the order they started', () => {
    const chats: OrderedChat[] = [chat('kept'), chat('later', 'Alpha', 20), chat('earlier', 'Zulu', 10)];
    expect(mergeManualOrder(['kept'], chats)).toEqual(['kept', 'earlier', 'later']);
  });

  it('starts from the A–Z order when nothing saved is still open', () => {
    const chats: OrderedChat[] = [chat('c', 'c', 1), chat('a', 'a', 3), chat('b', 'b', 2)];
    expect(mergeManualOrder([], chats)).toEqual(['a', 'b', 'c']);
    expect(mergeManualOrder(['gone'], chats)).toEqual(['a', 'b', 'c']);
  });

  it('ignores an id saved twice', () => {
    expect(mergeManualOrder(['a', 'b', 'a'], [chat('a'), chat('b')])).toEqual(['a', 'b']);
  });

  it('picks the order for the chosen mode', () => {
    const chats: OrderedChat[] = [chat('a'), chat('b')];
    expect(listOrder('name', chats, ['b', 'a'])).toEqual(['a', 'b']);
    expect(listOrder('manual', chats, ['b', 'a'])).toEqual(['b', 'a']);
  });
});

describe('moving an item', () => {
  const order: readonly string[] = ['a', 'b', 'c', 'd'];

  it('moves down and up', () => {
    expect(moveItem(order, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(order, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('clamps a target past either end', () => {
    expect(moveItem(order, 1, 99)).toEqual(['a', 'c', 'd', 'b']);
    expect(moveItem(order, 2, -5)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('leaves the order alone for a source that is not there, and never changes its input', () => {
    expect(moveItem(order, 7, 0)).toEqual(order);
    expect(moveItem(order, 1, 1)).toEqual(order);
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('stored values', () => {
  it('falls back to A–Z for an unknown or missing sort mode', () => {
    expect(parseListSortMode('manual')).toBe('manual');
    expect(parseListSortMode('shuffle')).toBe('name');
    expect(parseListSortMode(null)).toBe('name');
  });

  it('keeps only the ids of a saved manual order', () => {
    expect(parseManualOrder('["a", 3, "b", null]')).toEqual(['a', 'b']);
    expect(parseManualOrder('{"a": 1}')).toEqual([]);
    expect(parseManualOrder(null)).toEqual([]);
  });
});
