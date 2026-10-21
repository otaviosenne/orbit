import type { ListSortMode } from './list-order';

export const LIST_SORT_MODES: readonly ListSortMode[] = ['name', 'manual'];

const STORAGE_KEY: string = 'orbit.list-sort';
const DEFAULT_MODE: ListSortMode = 'name';

export function isListSortMode(value: string): value is ListSortMode {
  return (LIST_SORT_MODES as readonly string[]).includes(value);
}

export function parseListSortMode(saved: string | null): ListSortMode {
  return saved !== null && isListSortMode(saved) ? saved : DEFAULT_MODE;
}

export function loadListSortMode(): ListSortMode {
  try {
    return parseListSortMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_MODE;
  }
}

export function saveListSortMode(mode: ListSortMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The mode still applies for this run.
  }
}
