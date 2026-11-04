import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from '../src/core/prompt-history/history-entries';
import { expandPastes, HISTORY_LIMIT, parseHistory, promptsOf } from '../src/core/prompt-history/history-entries';

const line = (display: string, project: string, pasted: object = {}): string => JSON.stringify({ display, pastedContents: pasted, timestamp: 1, project, sessionId: 's' });
const plain = (entry: HistoryEntry): string => entry.display;

describe('the prompt history', () => {
  it("walks only the chat's folder, oldest first, and skips broken lines", () => {
    const entries: HistoryEntry[] = parseHistory([line('first', '/a'), 'not json', line('elsewhere', '/b'), line('second', '/a')].join('\n'));
    expect(promptsOf(entries, '/a', plain)).toEqual(['first', 'second']);
  });

  it('counts a prompt sent twice in a row once, and keeps only the newest ones', () => {
    const repeated: HistoryEntry[] = parseHistory([line('again', '/a'), line('again', '/a')].join('\n'));
    expect(promptsOf(repeated, '/a', plain)).toEqual(['again']);
    const many: HistoryEntry[] = parseHistory(Array.from({ length: HISTORY_LIMIT + 5 }, (_unused: unknown, index: number) => line(`p${index}`, '/a')).join('\n'));
    const prompts: string[] = promptsOf(many, '/a', plain);
    expect(prompts).toHaveLength(HISTORY_LIMIT);
    expect(prompts.at(-1)).toBe(`p${HISTORY_LIMIT + 4}`);
  });

  it('puts the pasted text back in place of its marker, from the entry or the paste cache', () => {
    const [inline, cached, lost] = parseHistory([
      line('[Pasted text #1 +2 lines]\n\nwhy?', '/a', { 1: { id: 1, type: 'text', content: 'a\nb\nc' } }),
      line('see [Pasted text #2 +9 lines]', '/a', { 2: { id: 2, type: 'text', contentHash: 'abc123' } }),
      line('see [Pasted text #3 +9 lines]', '/a', { 3: { id: 3, type: 'text', contentHash: 'fff' } }),
    ].join('\n'));
    const cache = (hash: string): string | null => (hash === 'abc123' ? 'from the cache' : null);
    expect(expandPastes(inline as HistoryEntry, cache)).toBe('a\nb\nc\n\nwhy?');
    expect(expandPastes(cached as HistoryEntry, cache)).toBe('see from the cache');
    expect(expandPastes(lost as HistoryEntry, cache)).toBe('see [Pasted text #3 +9 lines]');
  });
});
