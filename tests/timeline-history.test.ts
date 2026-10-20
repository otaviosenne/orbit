import { describe, expect, it } from 'vitest';
import { settleClosedAgents } from '../src/core/timeline-history/closed-agents';
import { filesActiveSince, historySince } from '../src/core/timeline-history/history-window';
import { reachesBack } from '../src/core/timeline-history/tail-coverage';
import type { SessionFile } from '../src/core/past-chats/session-files';
import type { HistoryFetchMark } from '../src/renderer/views/timeline-history-feed';
import { TIMELINE_HISTORY_REFRESH_MS, isHistoryFetchDue } from '../src/renderer/views/timeline-history-feed';
import { TIMELINE_RANGES, rangeHistoryMs } from '../src/renderer/views/timeline-range';
import { TIMELINE_MAX_HISTORY_MS } from '../src/shared/time-span';
import type { AgentSnapshot } from '../src/shared/types';

const MINUTE: number = 60_000;
const NOW: number = Date.parse('2026-10-20T12:00:00Z');

describe('historySince', () => {
  it('refuses anything but a finite time', () => {
    expect(historySince('yesterday', NOW)).toBeNull();
    expect(historySince(Number.NaN, NOW)).toBeNull();
    expect(historySince(Number.NEGATIVE_INFINITY, NOW)).toBeNull();
  });

  it('never reaches further back than the widest range, nor into the future', () => {
    expect(historySince(0, NOW)).toBe(NOW - TIMELINE_MAX_HISTORY_MS);
    expect(historySince(NOW + MINUTE, NOW)).toBe(NOW);
    expect(historySince(NOW - MINUTE, NOW)).toBe(NOW - MINUTE);
  });

  it('covers every range the timeline offers', () => {
    for (const range of TIMELINE_RANGES) expect(rangeHistoryMs(range)).toBeLessThanOrEqual(TIMELINE_MAX_HISTORY_MS);
  });
});

describe('filesActiveSince', () => {
  const file = (sessionId: string, minutesAgo: number): SessionFile => ({
    sessionId,
    path: `/p/${sessionId}.jsonl`,
    projectDir: '/p',
    modifiedAt: NOW - minutesAgo * MINUTE,
    sizeBytes: 1,
  });

  it('keeps closed transcripts written inside the window', () => {
    const files: SessionFile[] = [file('recent', 5), file('old', 90), file('live', 1)];
    expect(filesActiveSince(files, new Set(['live']), NOW - 60 * MINUTE).map((kept: SessionFile) => kept.sessionId)).toEqual(['recent']);
  });
});

describe('settleClosedAgents', () => {
  it('ends unfinished agents at their last write and leaves finished ones alone', () => {
    const quiet: AgentSnapshot = { id: 'q', description: 'q', agentType: 'x', state: 'quiet', startedAt: 1, lastActivityAt: 5, endedAt: null };
    const done: AgentSnapshot = { id: 'd', description: 'd', agentType: 'x', state: 'done', startedAt: 1, lastActivityAt: 9, endedAt: 8 };
    expect(settleClosedAgents([quiet, done])).toEqual([{ ...quiet, state: 'done', endedAt: 5 }, done]);
  });
});

describe('reachesBack', () => {
  const line = (iso: string): string => `{"type":"user","timestamp":"${iso}"}\n`;

  it('is satisfied once the first timestamp is at or before the moment', () => {
    expect(reachesBack(line('2026-10-20T10:00:00Z') + line('2026-10-20T11:00:00Z'), Date.parse('2026-10-20T10:30:00Z'))).toBe(true);
    expect(reachesBack(line('2026-10-20T11:00:00Z'), Date.parse('2026-10-20T10:30:00Z'))).toBe(false);
  });

  it('asks for more when the text has no timestamp at all', () => {
    expect(reachesBack('{"type":"agent-color"}', NOW)).toBe(false);
  });
});

describe('isHistoryFetchDue', () => {
  const mark: HistoryFetchMark = { at: NOW, range: '1h', openSessionIds: new Set(['a', 'b']) };

  it('fetches the first time, on a new range and once the data is stale', () => {
    expect(isHistoryFetchDue(null, '1h', new Set(), NOW)).toBe(true);
    expect(isHistoryFetchDue(mark, '6h', new Set(['a', 'b']), NOW)).toBe(true);
    expect(isHistoryFetchDue(mark, '1h', new Set(['a', 'b']), NOW + TIMELINE_HISTORY_REFRESH_MS)).toBe(true);
  });

  it('waits between polls while nothing changed, even when a chat opened', () => {
    expect(isHistoryFetchDue(mark, '1h', new Set(['a', 'b', 'c']), NOW + TIMELINE_HISTORY_REFRESH_MS - 1)).toBe(false);
  });

  it('fetches as soon as a chat closes, so it moves to history instead of vanishing', () => {
    expect(isHistoryFetchDue(mark, '1h', new Set(['a']), NOW + 1)).toBe(true);
  });
});
