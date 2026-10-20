import { describe, expect, it } from 'vitest';
import type { ChatColor } from '../src/shared/chat-colors';
import { CHAT_COLORS } from '../src/shared/chat-colors';
import { pickChatColor } from '../src/renderer/new-chat/chat-color-pick';

const FIRST: () => number = (): number => 0;
const LAST: () => number = (): number => 0.999999;

describe('pickChatColor', () => {
  it('never repeats the previous new chat color', () => {
    for (let step: number = 0; step < 10; step += 1) {
      expect(pickChatColor('red', [], (): number => step / 10)).not.toBe('red');
    }
  });

  it('prefers colors no open chat has', () => {
    const inUse: (string | null)[] = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', null];
    expect([pickChatColor(null, inUse, FIRST), pickChatColor(null, inUse, LAST)]).toEqual(['purple', 'pink']);
  });

  it('falls back to any color but the previous one when all are in use', () => {
    const picked: ChatColor = pickChatColor('blue', [...CHAT_COLORS], LAST);
    expect(picked).toBe('pink');
    expect(pickChatColor('pink', [...CHAT_COLORS], LAST)).toBe('purple');
  });

  it('stays inside the palette even if random returns 1', () => {
    expect(CHAT_COLORS).toContain(pickChatColor(null, [], (): number => 1));
  });
});
