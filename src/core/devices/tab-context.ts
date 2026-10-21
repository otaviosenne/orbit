// Claude in Chrome appends a "Tab Context" block to its results naming the tab it acted on and every tab
// of the chat's group, each as `• tabId 1143463331: "Title" ("https://url")`.
export interface TabListing {
  readonly tabId: number;
  readonly title: string;
  readonly url: string;
}

export interface TabContext {
  // Tabs the result says were used or created, in the order they appear.
  readonly usedTabIds: readonly number[];
  readonly closedTabIds: readonly number[];
  readonly listings: readonly TabListing[];
}

const EXECUTED_ON: RegExp = /Executed on tabId: (\d+)/g;
const CREATED: RegExp = /Created new tab\. Tab ID: (\d+)/g;
const CLOSED: RegExp = /Closed tab (\d+)/g;
const LISTING: RegExp = /tabId (\d+): "(.*)" \("(.*)"\)\s*$/gm;

export function parseTabContext(text: string): TabContext {
  return {
    usedTabIds: [...captureIds(text, CREATED), ...captureIds(text, EXECUTED_ON)],
    closedTabIds: captureIds(text, CLOSED),
    listings: [...text.matchAll(LISTING)].map((match: RegExpMatchArray): TabListing => ({
      tabId: Number(match[1]),
      title: match[2] ?? '',
      url: match[3] ?? '',
    })),
  };
}

function captureIds(text: string, pattern: RegExp): number[] {
  return [...text.matchAll(pattern)].map((match: RegExpMatchArray) => Number(match[1]));
}
