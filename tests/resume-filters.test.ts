import { describe, expect, it } from 'vitest';
import type { PastChat } from '../src/shared/types';
import type { DayGroup } from '../src/renderer/resume/day-groups';
import { groupByDay } from '../src/renderer/resume/day-groups';
import { parseFilters } from '../src/renderer/resume/filter-store';
import { formatAgo, formatSize } from '../src/renderer/resume/past-chat-format';
import type { ResumeFilters } from '../src/renderer/resume/resume-filters';
import { DEFAULT_FILTERS, activeFilterCount, applyFilters, repositoryNames } from '../src/renderer/resume/resume-filters';

const HOUR_MS: number = 60 * 60 * 1000;
const DAY_MS: number = 24 * HOUR_MS;
// Midday, so "today" and "yesterday" never straddle midnight in any time zone the tests run in.
const NOW: number = new Date(2026, 9, 20, 12, 0, 0).getTime();

function chat(sessionId: string, title: string, repository: string, ageMs: number, sizeBytes: number): PastChat {
  return { sessionId, title, repository: { name: repository, root: `/repo/${repository}` }, lastActivityAt: NOW - ageMs, sizeBytes };
}

const CHATS: PastChat[] = [
  chat('a', 'Fix login', 'api', HOUR_MS, 3000),
  chat('b', 'Board layout', 'app', 2 * HOUR_MS, 9000),
  chat('c', 'Deploy notes', 'api', DAY_MS, 1000),
  chat('d', 'Archive cleanup', 'infra', 10 * DAY_MS, 5000),
  chat('e', 'Old idea', 'app', 40 * DAY_MS, 7000),
];

function ids(chats: readonly PastChat[]): string[] {
  return chats.map((item: PastChat) => item.sessionId);
}

describe('applyFilters', () => {
  it('keeps everything newest first by default', () => {
    expect(ids(applyFilters(CHATS, DEFAULT_FILTERS, '', NOW))).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('filters by date range', () => {
    expect(ids(applyFilters(CHATS, { ...DEFAULT_FILTERS, date: 'today' }, '', NOW))).toEqual(['a', 'b']);
    expect(ids(applyFilters(CHATS, { ...DEFAULT_FILTERS, date: 'week' }, '', NOW))).toEqual(['a', 'b', 'c']);
    expect(ids(applyFilters(CHATS, { ...DEFAULT_FILTERS, date: 'month' }, '', NOW))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filters by any of the chosen repositories', () => {
    expect(ids(applyFilters(CHATS, { ...DEFAULT_FILTERS, repositories: ['api', 'infra'] }, '', NOW))).toEqual(['a', 'c', 'd']);
  });

  it('matches every search word against the title or the repository', () => {
    expect(ids(applyFilters(CHATS, DEFAULT_FILTERS, 'LOGIN', NOW))).toEqual(['a']);
    expect(ids(applyFilters(CHATS, DEFAULT_FILTERS, 'app old', NOW))).toEqual(['e']);
    expect(ids(applyFilters(CHATS, DEFAULT_FILTERS, 'api deploy', NOW))).toEqual(['c']);
  });

  it('sorts by name or by size', () => {
    expect(ids(applyFilters(CHATS, { ...DEFAULT_FILTERS, sort: 'name' }, '', NOW))).toEqual(['d', 'b', 'c', 'a', 'e']);
    expect(ids(applyFilters(CHATS, { ...DEFAULT_FILTERS, sort: 'size' }, '', NOW))).toEqual(['b', 'e', 'd', 'a', 'c']);
  });
});

describe('activeFilterCount', () => {
  it('counts date and repository filters but not the sort', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    const filters: ResumeFilters = { date: 'week', repositories: ['api', 'app'], sort: 'size' };
    expect(activeFilterCount(filters)).toBe(2);
  });
});

describe('repositoryNames', () => {
  it('lists each repository once, alphabetically', () => {
    expect(repositoryNames(CHATS)).toEqual(['api', 'app', 'infra']);
  });
});

describe('groupByDay', () => {
  it('puts Today and Yesterday headers over consecutive chats of the same day', () => {
    const groups: DayGroup[] = groupByDay(applyFilters(CHATS, DEFAULT_FILTERS, '', NOW), NOW);
    expect(groups.map((group: DayGroup) => group.label).slice(0, 2)).toEqual(['Today', 'Yesterday']);
    expect(groups.map((group: DayGroup) => ids(group.chats))).toEqual([['a', 'b'], ['c'], ['d'], ['e']]);
  });
});

describe('parseFilters', () => {
  it('replaces unknown saved values with the defaults', () => {
    expect(parseFilters({ date: 'forever', repositories: ['api', 3], sort: 'size' })).toEqual({ date: 'any', repositories: ['api'], sort: 'size' });
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });
});

describe('past chat formatting', () => {
  it('describes how long ago in words', () => {
    expect(formatAgo(NOW - 30 * 1000, NOW)).toBe('just now');
    expect(formatAgo(NOW - 5 * 60 * 1000, NOW)).toBe('5 min ago');
    expect(formatAgo(NOW - 3 * HOUR_MS, NOW)).toBe('3h ago');
    expect(formatAgo(NOW - DAY_MS, NOW)).toBe('1 day ago');
    expect(formatAgo(NOW - 2 * DAY_MS, NOW)).toBe('2 days ago');
    expect(formatAgo(NOW - 21 * DAY_MS, NOW)).toBe('3 weeks ago');
  });

  it('shows sizes in readable units', () => {
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(24 * 1024 * 1024)).toBe('24 MB');
  });
});
