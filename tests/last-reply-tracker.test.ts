import { describe, expect, it } from 'vitest';
import { findLatestReply } from '../src/core/last-reply-tracker';

describe('findLatestReply', () => {
  it('takes the newest reply of the chat itself, ignoring its agents and other records', () => {
    const text: string = [
      JSON.stringify({ type: 'assistant', timestamp: '2026-10-20T10:00:00.000Z', message: { content: [] } }),
      JSON.stringify({ type: 'assistant', isSidechain: true, timestamp: '2026-10-20T11:00:00.000Z', message: { content: [] } }),
      JSON.stringify({ type: 'user', timestamp: '2026-10-20T12:00:00.000Z', message: { content: 'resumed' } }),
    ].join('\n');
    expect(findLatestReply(text)).toBe(Date.parse('2026-10-20T10:00:00.000Z'));
  });

  it('is null before the first reply', () => {
    expect(findLatestReply(JSON.stringify({ type: 'user', timestamp: '2026-10-20T12:00:00.000Z', message: { content: 'hi' } }))).toBeNull();
  });
});
