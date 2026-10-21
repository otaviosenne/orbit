import { describe, expect, it } from 'vitest';
import { lastMessage } from '../src/renderer/board/last-message';
import type { TranscriptItem } from '../src/shared/types';

function message(id: string, role: 'user' | 'assistant', text: string): TranscriptItem {
  return { kind: 'message', id, timestamp: 0, role, text, images: [] } as unknown as TranscriptItem;
}

describe('lastMessage', () => {
  it('finds the newest message behind tools and turns', () => {
    const items: TranscriptItem[] = [
      message('1', 'user', 'fix the bug'),
      message('2', 'assistant', 'Done, the bug is fixed.'),
      { kind: 'turn', id: 't', timestamp: 0, durationMs: 1 } as unknown as TranscriptItem,
    ];
    expect(lastMessage(items)?.id).toBe('2');
  });

  it('skips empty messages and returns null when there is none', () => {
    expect(lastMessage([message('1', 'assistant', '   ')])).toBeNull();
    expect(lastMessage([])).toBeNull();
  });
});
