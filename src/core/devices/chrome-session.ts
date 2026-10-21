import type { SnssCommand } from './snss-commands';
import { readSnssCommands } from './snss-commands';
import type { SnssNavigation } from './snss-navigation';
import { readSnssNavigation } from './snss-navigation';

// A tab as Chrome's session file last recorded it. Its id is the same number the chrome.tabs API (and so
// Claude in Chrome) uses, which is what lets a transcript's tabId be found here.
export interface SessionTab {
  readonly id: number;
  readonly title: string;
  readonly url: string;
}

// An open window with its tabs in tab strip order and the position of the one it shows.
export interface SessionWindow {
  readonly id: number;
  readonly tabs: readonly SessionTab[];
  readonly selectedRank: number | null;
}

export interface ChromeSession {
  readonly windows: readonly SessionWindow[];
}

// Command ids from Chrome's session_service_commands.cc; the rest of the log is not needed to place a tab.
const SET_TAB_WINDOW: number = 0;
const SET_TAB_INDEX_IN_WINDOW: number = 2;
const UPDATE_TAB_NAVIGATION: number = 6;
const SET_SELECTED_NAVIGATION_INDEX: number = 7;
const SET_SELECTED_TAB_IN_INDEX: number = 8;
const TAB_CLOSED: number = 16;
const WINDOW_CLOSED: number = 17;

const FIRST_INT: number = 0;
const SECOND_INT: number = 4;
const ID_PAIR_BYTES: number = 8;
const ID_BYTES: number = 4;

interface TabRecord {
  windowId: number | null;
  index: number;
  // Order of the latest index write, so a tab placed more recently wins a shared index.
  indexedAt: number;
  selectedNavigation: number | null;
  readonly navigations: Map<number, SnssNavigation>;
}

interface SessionLog {
  readonly tabs: Map<number, TabRecord>;
  readonly selectedIndex: Map<number, number>;
  readonly closedTabs: Set<number>;
  readonly closedWindows: Set<number>;
}

export function parseChromeSession(bytes: Uint8Array): ChromeSession {
  const log: SessionLog = { tabs: new Map(), selectedIndex: new Map(), closedTabs: new Set(), closedWindows: new Set() };
  readSnssCommands(bytes).forEach((command: SnssCommand, order: number) => applyCommand(log, command, order));
  return { windows: openWindows(log) };
}

function applyCommand(log: SessionLog, command: SnssCommand, order: number): void {
  const { id, payload } = command;
  if (id === UPDATE_TAB_NAVIGATION) return applyNavigation(log, readSnssNavigation(payload));
  if (id === TAB_CLOSED || id === WINDOW_CLOSED) return applyClose(log, id, payload);
  if (payload.byteLength < ID_PAIR_BYTES) return;
  const first: number = payload.getInt32(FIRST_INT, true);
  const second: number = payload.getInt32(SECOND_INT, true);
  if (id === SET_TAB_WINDOW) tabRecord(log, second).windowId = first;
  else if (id === SET_TAB_INDEX_IN_WINDOW) Object.assign(tabRecord(log, first), { index: second, indexedAt: order });
  else if (id === SET_SELECTED_NAVIGATION_INDEX) tabRecord(log, first).selectedNavigation = second;
  else if (id === SET_SELECTED_TAB_IN_INDEX) log.selectedIndex.set(first, second);
}

function applyNavigation(log: SessionLog, navigation: SnssNavigation | null): void {
  if (navigation !== null) tabRecord(log, navigation.tabId).navigations.set(navigation.index, navigation);
}

function applyClose(log: SessionLog, id: number, payload: DataView): void {
  if (payload.byteLength < ID_BYTES) return;
  const closed: number = payload.getInt32(FIRST_INT, true);
  (id === TAB_CLOSED ? log.closedTabs : log.closedWindows).add(closed);
}

function tabRecord(log: SessionLog, tabId: number): TabRecord {
  const known: TabRecord | undefined = log.tabs.get(tabId);
  if (known !== undefined) return known;
  const created: TabRecord = { windowId: null, index: 0, indexedAt: -1, selectedNavigation: null, navigations: new Map() };
  log.tabs.set(tabId, created);
  return created;
}

function openWindows(log: SessionLog): SessionWindow[] {
  const byWindow: Map<number, [number, TabRecord][]> = new Map();
  for (const [tabId, record] of log.tabs) {
    if (record.windowId === null || log.closedTabs.has(tabId) || log.closedWindows.has(record.windowId)) continue;
    byWindow.set(record.windowId, [...(byWindow.get(record.windowId) ?? []), [tabId, record]]);
  }
  return [...byWindow].map(([windowId, records]): SessionWindow => toWindow(windowId, records, log.selectedIndex.get(windowId)));
}

// Indices are only ever compared: closed tabs leave gaps, so a tab's position is its rank among the open ones.
function toWindow(id: number, records: [number, TabRecord][], selectedIndex: number | undefined): SessionWindow {
  const ordered: [number, TabRecord][] = [...records].sort(([, left], [, right]) => left.index - right.index || right.indexedAt - left.indexedAt);
  const selected: number = ordered.findIndex(([, record]) => record.index === selectedIndex);
  return { id, tabs: ordered.map(([tabId, record]) => toTab(tabId, record)), selectedRank: selected < 0 ? null : selected };
}

function toTab(id: number, record: TabRecord): SessionTab {
  const shown: SnssNavigation | undefined =
    (record.selectedNavigation === null ? undefined : record.navigations.get(record.selectedNavigation)) ?? latestNavigation(record);
  return { id, title: shown?.title ?? '', url: shown?.url ?? '' };
}

function latestNavigation(record: TabRecord): SnssNavigation | undefined {
  return [...record.navigations.values()].at(-1);
}
