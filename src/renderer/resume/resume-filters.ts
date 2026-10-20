import type { PastChat } from '../../shared/types';

export type DateRange = 'any' | 'today' | 'week' | 'month';
export const DATE_RANGES: readonly DateRange[] = ['any', 'today', 'week', 'month'];

export type SortOrder = 'recent' | 'name' | 'size';
export const SORT_ORDERS: readonly SortOrder[] = ['recent', 'name', 'size'];

export interface ResumeFilters {
  readonly date: DateRange;
  // Repository names; empty means every repository.
  readonly repositories: readonly string[];
  readonly sort: SortOrder;
}

export const DEFAULT_FILTERS: ResumeFilters = { date: 'any', repositories: [], sort: 'recent' };

const DAY_MS: number = 24 * 60 * 60 * 1000;
const WEEK_DAYS: number = 7;
const MONTH_DAYS: number = 30;
const WORD_SEPARATOR: RegExp = /\s+/;

export function applyFilters(chats: readonly PastChat[], filters: ResumeFilters, query: string, now: number): PastChat[] {
  const since: number = rangeStart(filters.date, now);
  const words: string[] = queryWords(query);
  const repositories: ReadonlySet<string> = new Set(filters.repositories);
  return sortChats(
    chats.filter(
      (chat: PastChat) =>
        chat.lastActivityAt >= since && (repositories.size === 0 || repositories.has(chat.repository.name)) && matchesWords(chat, words),
    ),
    filters.sort,
  );
}

// Sort is how the list is read, not what it holds, so only date and repository count as active filters.
export function activeFilterCount(filters: ResumeFilters): number {
  return (filters.date === DEFAULT_FILTERS.date ? 0 : 1) + (filters.repositories.length === 0 ? 0 : 1);
}

export function repositoryNames(chats: readonly PastChat[]): string[] {
  return [...new Set(chats.map((chat: PastChat) => chat.repository.name))].sort((a: string, b: string) => a.localeCompare(b));
}

function rangeStart(range: DateRange, now: number): number {
  if (range === 'today') return startOfDay(now);
  if (range === 'week') return now - WEEK_DAYS * DAY_MS;
  if (range === 'month') return now - MONTH_DAYS * DAY_MS;
  return Number.NEGATIVE_INFINITY;
}

export function startOfDay(timestamp: number): number {
  const day: Date = new Date(timestamp);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

function queryWords(query: string): string[] {
  return query.trim().toLowerCase().split(WORD_SEPARATOR).filter((word: string) => word.length > 0);
}

// Every typed word has to appear in the title or the repository name, in any order.
function matchesWords(chat: PastChat, words: readonly string[]): boolean {
  const haystack: string = `${chat.title} ${chat.repository.name}`.toLowerCase();
  return words.every((word: string) => haystack.includes(word));
}

function sortChats(chats: PastChat[], order: SortOrder): PastChat[] {
  if (order === 'name') return chats.sort((a: PastChat, b: PastChat) => a.title.localeCompare(b.title));
  if (order === 'size') return chats.sort((a: PastChat, b: PastChat) => b.sizeBytes - a.sizeBytes);
  return chats.sort((a: PastChat, b: PastChat) => b.lastActivityAt - a.lastActivityAt);
}
