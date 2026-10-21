import type { BrowserTabReference } from './device-references';
import type { TabContext, TabListing } from './tab-context';
import { parseTabContext } from './tab-context';
import type { ToolCall } from './tool-calls';

const CHROME_MCP_PREFIX: string = 'mcp__claude-in-chrome__';
const CLOSE_TOOL: string = 'tabs_close_mcp';
const NAVIGATE_TOOL: string = 'navigate';

interface TabFacts {
  readonly title: string | null;
  readonly url: string | null;
}

interface TabUpdate {
  readonly title?: string;
  readonly url?: string;
}

interface TabState {
  // Every use in order; the latest one whose tab is still open wins.
  readonly uses: { readonly tabId: number; readonly at: number }[];
  readonly closed: Set<number>;
  readonly facts: Map<number, TabFacts>;
}

// The last tab the chat drove through Claude in Chrome and still has open, with its latest known title and URL.
export function extractBrowserTab(calls: readonly ToolCall[]): BrowserTabReference | null {
  const state: TabState = { uses: [], closed: new Set(), facts: new Map() };
  for (const call of calls) {
    if (call.name.startsWith(CHROME_MCP_PREFIX)) applyCall(state, call);
  }
  return latestOpenTab(state);
}

function applyCall(state: TabState, call: ToolCall): void {
  const tool: string = call.name.slice(CHROME_MCP_PREFIX.length);
  const inputTabs: number[] = inputTabIds(call.input);
  if (tool === CLOSE_TOOL) inputTabs.forEach((tabId: number) => state.closed.add(tabId));
  else inputTabs.forEach((tabId: number) => state.uses.push({ tabId, at: call.at }));
  const url: unknown = call.input['url'];
  if (tool === NAVIGATE_TOOL && typeof url === 'string') inputTabs.forEach((tabId: number) => remember(state, tabId, { url }));
  if (call.resultText !== null) applyResult(state, parseTabContext(call.resultText), call.at);
}

function applyResult(state: TabState, context: TabContext, at: number): void {
  context.usedTabIds.forEach((tabId: number) => state.uses.push({ tabId, at }));
  context.closedTabIds.forEach((tabId: number) => state.closed.add(tabId));
  context.listings.forEach((listing: TabListing) => remember(state, listing.tabId, { title: listing.title, url: listing.url }));
}

// A tab still loading is listed with its URL as title (or an empty URL); later listings fill in the real ones.
function remember(state: TabState, tabId: number, update: TabUpdate): void {
  const known: TabFacts = state.facts.get(tabId) ?? { title: null, url: null };
  state.facts.set(tabId, {
    title: update.title !== undefined && update.title.length > 0 ? update.title : known.title,
    url: update.url !== undefined && update.url.length > 0 ? update.url : known.url,
  });
}

function latestOpenTab(state: TabState): BrowserTabReference | null {
  for (let index: number = state.uses.length - 1; index >= 0; index--) {
    const use: { readonly tabId: number; readonly at: number } | undefined = state.uses[index];
    if (use === undefined || state.closed.has(use.tabId)) continue;
    const facts: TabFacts = state.facts.get(use.tabId) ?? { title: null, url: null };
    return { tabId: use.tabId, title: facts.title, url: facts.url, at: use.at };
  }
  return null;
}

// Most tools take a top-level tabId; browser_batch nests one per action.
function inputTabIds(input: Readonly<Record<string, unknown>>): number[] {
  const own: unknown = input['tabId'];
  const actions: unknown = input['actions'];
  const nested: number[] = Array.isArray(actions) ? actions.flatMap((action: unknown) => nestedTabId(action)) : [];
  return [...(typeof own === 'number' ? [own] : []), ...nested];
}

function nestedTabId(action: unknown): number[] {
  if (typeof action !== 'object' || action === null) return [];
  const input: unknown = (action as Record<string, unknown>)['input'];
  if (typeof input !== 'object' || input === null) return [];
  const tabId: unknown = (input as Record<string, unknown>)['tabId'];
  return typeof tabId === 'number' ? [tabId] : [];
}
