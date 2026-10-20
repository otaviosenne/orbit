import { describe, expect, it } from 'vitest';
import { extractTurnProgress } from '../src/core/turn-progress';
import type { TranscriptRecord } from '../src/core/transcript-record';

const assistant = (id: string, tokens: number): TranscriptRecord => ({ type: 'assistant', message: { id, usage: { output_tokens: tokens } } });

describe('extractTurnProgress', () => {
  it('starts at the last real prompt and counts each response once', () => {
    const records: TranscriptRecord[] = [
      { type: 'user', timestamp: '2026-10-20T10:00:00Z', message: { content: 'older' } },
      assistant('m0', 999),
      { type: 'user', timestamp: '2026-10-20T11:00:00Z', message: { content: 'build it' } },
      assistant('m1', 300),
      assistant('m1', 300),
      { type: 'user', message: { content: [{ type: 'tool_result' }] } },
      assistant('m2', 1200),
    ];
    expect(extractTurnProgress(records)).toEqual({ startedAt: Date.parse('2026-10-20T11:00:00Z'), outputTokens: 1500 });
  });

  it('is nothing when no prompt is in view', () => {
    expect(extractTurnProgress([assistant('m1', 10)])).toBeNull();
  });
});
