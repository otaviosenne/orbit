import { describe, expect, it } from 'vitest';
import type { ChromeSession } from '../src/core/devices/chrome-session';
import { parseChromeSession } from '../src/core/devices/chrome-session';
import { readSnssCommands } from '../src/core/devices/snss-commands';

const SET_TAB_WINDOW: number = 0;
const SET_TAB_INDEX_IN_WINDOW: number = 2;
const UPDATE_TAB_NAVIGATION: number = 6;
const SET_SELECTED_NAVIGATION_INDEX: number = 7;
const SET_SELECTED_TAB_IN_INDEX: number = 8;
const TAB_CLOSED: number = 16;
const WINDOW_CLOSED: number = 17;
const SNSS_VERSION: number = 3;
const ALIGNMENT: number = 4;

const WINDOW_A: number = 1143463630;
const WINDOW_B: number = 1143463700;

function int32s(...values: number[]): Uint8Array {
  const bytes: Uint8Array = new Uint8Array(values.length * ALIGNMENT);
  values.forEach((value: number, index: number) => new DataView(bytes.buffer).setInt32(index * ALIGNMENT, value, true));
  return bytes;
}

function padded(bytes: Uint8Array): Uint8Array {
  const out: Uint8Array = new Uint8Array(Math.ceil(bytes.length / ALIGNMENT) * ALIGNMENT);
  out.set(bytes);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out: Uint8Array = new Uint8Array(parts.reduce((total: number, part: Uint8Array) => total + part.length, 0));
  parts.reduce((offset: number, part: Uint8Array) => (out.set(part, offset), offset + part.length), 0);
  return out;
}

function utf16(text: string): Uint8Array {
  const bytes: Uint8Array = new Uint8Array(text.length * 2);
  [...text].forEach((char: string, index: number) => new DataView(bytes.buffer).setUint16(index * 2, char.charCodeAt(0), true));
  return bytes;
}

// Same layout Chrome writes: the pickle's own payload size, then tab id, entry index, URL and title.
function navigationPayload(tabId: number, index: number, url: string, title: string): Uint8Array {
  const urlBytes: Uint8Array = new TextEncoder().encode(url);
  const body: Uint8Array = concat(int32s(tabId, index, urlBytes.length), padded(urlBytes), int32s(title.length), padded(utf16(title)));
  return concat(int32s(body.length), body);
}

function command(id: number, payload: Uint8Array): Uint8Array {
  const out: Uint8Array = new Uint8Array(2 + 1 + payload.length);
  new DataView(out.buffer).setUint16(0, 1 + payload.length, true);
  out[2] = id;
  out.set(payload, 3);
  return out;
}

function sessionFile(...commands: Uint8Array[]): Uint8Array {
  return concat(new TextEncoder().encode('SNSS'), int32s(SNSS_VERSION), ...commands);
}

function tab(windowId: number, tabId: number, index: number, title: string, url: string): Uint8Array[] {
  return [
    command(SET_TAB_WINDOW, int32s(windowId, tabId)),
    command(SET_TAB_INDEX_IN_WINDOW, int32s(tabId, index)),
    command(UPDATE_TAB_NAVIGATION, navigationPayload(tabId, 0, url, title)),
    command(SET_SELECTED_NAVIGATION_INDEX, int32s(tabId, 0)),
  ];
}

describe('readSnssCommands', () => {
  it('ignores a file that is not a session file', () => {
    expect(readSnssCommands(new TextEncoder().encode('NOPE0000'))).toEqual([]);
  });

  it('drops a command Chrome was still writing when the file was read', () => {
    const whole: Uint8Array = sessionFile(command(SET_TAB_WINDOW, int32s(WINDOW_A, 1)), command(SET_TAB_WINDOW, int32s(WINDOW_A, 2)));
    expect(readSnssCommands(whole.subarray(0, whole.length - 3)).length).toBe(1);
  });
});

describe('parseChromeSession', () => {
  it('lists each window with its tabs in strip order, titles and the selected position', () => {
    const session: ChromeSession = parseChromeSession(
      sessionFile(
        ...tab(WINDOW_A, 11, 1, 'Docs', 'https://docs.example/'),
        ...tab(WINDOW_A, 10, 0, 'Mail', 'https://mail.example/'),
        ...tab(WINDOW_B, 20, 0, 'Página — ünïcode', 'https://b.example/'),
        command(SET_SELECTED_TAB_IN_INDEX, int32s(WINDOW_A, 1)),
      ),
    );
    expect(session.windows).toEqual([
      {
        id: WINDOW_A,
        tabs: [
          { id: 10, title: 'Mail', url: 'https://mail.example/' },
          { id: 11, title: 'Docs', url: 'https://docs.example/' },
        ],
        selectedRank: 1,
      },
      { id: WINDOW_B, tabs: [{ id: 20, title: 'Página — ünïcode', url: 'https://b.example/' }], selectedRank: null },
    ]);
  });

  it('shows the title of the history entry the tab is on, not the last one written', () => {
    const session: ChromeSession = parseChromeSession(
      sessionFile(
        ...tab(WINDOW_A, 10, 0, 'First', 'https://a.example/1'),
        command(UPDATE_TAB_NAVIGATION, navigationPayload(10, 1, 'https://a.example/2', 'Second')),
        command(SET_SELECTED_NAVIGATION_INDEX, int32s(10, 0)),
      ),
    );
    expect(session.windows[0]?.tabs[0]?.title).toBe('First');
  });

  it('ranks tabs around the gaps closed tabs leave, and drops closed windows', () => {
    const session: ChromeSession = parseChromeSession(
      sessionFile(
        ...tab(WINDOW_A, 10, 0, 'A', 'https://a.example/'),
        ...tab(WINDOW_A, 11, 1, 'B', 'https://b.example/'),
        ...tab(WINDOW_A, 12, 2, 'C', 'https://c.example/'),
        ...tab(WINDOW_B, 20, 0, 'Gone', 'https://gone.example/'),
        command(TAB_CLOSED, int32s(11, 0, 0)),
        command(WINDOW_CLOSED, int32s(WINDOW_B, 0, 0)),
        command(SET_SELECTED_TAB_IN_INDEX, int32s(WINDOW_A, 2)),
      ),
    );
    expect(session.windows.map((window) => window.tabs.map((sessionTab) => sessionTab.id))).toEqual([[10, 12]]);
    expect(session.windows[0]?.selectedRank).toBe(1);
  });

  it('puts a tab placed later before an older one holding the same index', () => {
    const session: ChromeSession = parseChromeSession(
      sessionFile(...tab(WINDOW_A, 10, 0, 'Old', 'https://old.example/'), ...tab(WINDOW_A, 11, 0, 'Inserted', 'https://new.example/')),
    );
    expect(session.windows[0]?.tabs.map((sessionTab) => sessionTab.id)).toEqual([11, 10]);
  });

  it('follows a tab dragged into another window', () => {
    const session: ChromeSession = parseChromeSession(
      sessionFile(...tab(WINDOW_A, 10, 0, 'A', 'https://a.example/'), command(SET_TAB_WINDOW, int32s(WINDOW_B, 10))),
    );
    expect(session.windows.map((window) => window.id)).toEqual([WINDOW_B]);
  });
});
