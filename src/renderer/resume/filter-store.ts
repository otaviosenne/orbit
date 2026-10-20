import type { DateRange, ResumeFilters, SortOrder } from './resume-filters';
import { DATE_RANGES, DEFAULT_FILTERS, SORT_ORDERS } from './resume-filters';

const FILTERS_KEY: string = 'orbit.resumeFilters';

// Anything unreadable falls back to the defaults field by field, so one bad value never hides the whole list.
export function loadResumeFilters(): ResumeFilters {
  try {
    const raw: string | null = localStorage.getItem(FILTERS_KEY);
    return raw === null ? DEFAULT_FILTERS : parseFilters(JSON.parse(raw) as Partial<Record<keyof ResumeFilters, unknown>>);
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function saveResumeFilters(filters: ResumeFilters): void {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // The choice just is not remembered.
  }
}

export function parseFilters(value: Partial<Record<keyof ResumeFilters, unknown>>): ResumeFilters {
  return {
    date: DATE_RANGES.includes(value.date as DateRange) ? (value.date as DateRange) : DEFAULT_FILTERS.date,
    repositories: Array.isArray(value.repositories)
      ? value.repositories.filter((name: unknown): name is string => typeof name === 'string')
      : DEFAULT_FILTERS.repositories,
    sort: SORT_ORDERS.includes(value.sort as SortOrder) ? (value.sort as SortOrder) : DEFAULT_FILTERS.sort,
  };
}
