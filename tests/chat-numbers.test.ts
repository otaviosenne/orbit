import { describe, expect, it } from 'vitest';
import { ChatNumbers } from '../src/renderer/voice-nav/chat-numbers';

const GRACE_PASSED_MS: number = 7000;

describe('ChatNumbers', () => {
  it('numbers chats in order of first appearance and keeps the numbers', () => {
    const numbers: ChatNumbers = new ChatNumbers();
    numbers.sync(['a', 'b', 'c'], 0);
    numbers.sync(['c', 'a', 'b', 'd'], 2000);
    expect(['a', 'b', 'c', 'd'].map((id: string) => numbers.numberOf(id))).toEqual([1, 2, 3, 4]);
    expect(numbers.sessionOf(3)).toBe('c');
    expect(numbers.sessionOf(9)).toBeNull();
  });

  it('keeps a number through a poll that misses the chat, and reuses it once the chat is really gone', () => {
    const numbers: ChatNumbers = new ChatNumbers();
    numbers.sync(['a', 'b', 'c'], 0);
    numbers.sync(['a', 'c'], 2000);
    expect(numbers.numberOf('b')).toBe(2);
    numbers.sync(['a', 'c'], GRACE_PASSED_MS);
    expect(numbers.numberOf('b')).toBeNull();
    numbers.sync(['a', 'c', 'e'], GRACE_PASSED_MS + 2000);
    expect(numbers.numberOf('e')).toBe(2);
  });
});
