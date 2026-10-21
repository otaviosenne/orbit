import { describe, expect, it } from 'vitest';
import { extractBrowserTab } from '../src/core/devices/browser-tab-references';
import type { BrowserTabReference, EmulatorReference } from '../src/core/devices/device-references';
import { emulatorTargets } from '../src/core/devices/emulator-commands';
import type { EmulatorTargets } from '../src/core/devices/emulator-commands';
import { extractEmulatorReferences } from '../src/core/devices/emulator-references';
import type { ToolCall } from '../src/core/devices/tool-calls';
import { collectToolCalls } from '../src/core/devices/tool-calls';
import type { TranscriptRecord } from '../src/core/transcript-record';

const T0: number = Date.parse('2026-10-21T10:00:00.000Z');
const MINUTE_MS: number = 60_000;

let nextId: number = 0;

// Shapes copied from real transcripts: an assistant tool_use, then the user record carrying its result.
function call(name: string, input: Record<string, unknown>, result: string | null = null, minute: number = 0): TranscriptRecord[] {
  const id: string = `toolu_${++nextId}`;
  const timestamp: string = new Date(T0 + minute * MINUTE_MS).toISOString();
  const use: TranscriptRecord = { type: 'assistant', timestamp, message: { content: [{ type: 'tool_use', id, name, input }] } };
  if (result === null) return [use];
  const answer: TranscriptRecord = {
    type: 'user',
    timestamp,
    message: { content: [{ type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text: result }] }] },
  };
  return [use, answer];
}

function calls(...records: TranscriptRecord[][]): ToolCall[] {
  return collectToolCalls(records.flat());
}

describe('emulatorTargets', () => {
  it('reads serials, including one stored in a variable', () => {
    expect(emulatorTargets('S="adb -s emulator-5554"; $S shell cmd location is-location-enabled').ports).toEqual([5554]);
  });

  it('reads an AVD launch with its port, but not the SDK folder named emulator', () => {
    expect(emulatorTargets('~/Android/Sdk/emulator/emulator -avd Pixel_6a_2 -port 5558 -no-boot-anim &').avds).toEqual([
      { avd: 'Pixel_6a_2', port: 5558 },
    ]);
    expect(emulatorTargets('emulator @Pixel_6a_3').avds).toEqual([{ avd: 'Pixel_6a_3', port: null }]);
  });

  it('does not take listing AVDs or adb devices for a reference', () => {
    const listing: EmulatorTargets = emulatorTargets('emulator -list-avds; adb devices');
    expect([listing.ports, listing.avds, listing.untargeted]).toEqual([[], [], false]);
  });

  it('marks expo run:android and a bare adb shell as untargeted, but not adb -s with a variable', () => {
    expect(emulatorTargets('cd apps/mobile && npx expo run:android').untargeted).toBe(true);
    expect(emulatorTargets('adb shell pm list packages').untargeted).toBe(true);
    expect(emulatorTargets('for s in $(adb devices); do adb -s $s shell getprop; done').untargeted).toBe(false);
  });

  it('records emu kill as closing that serial', () => {
    expect(emulatorTargets('adb -s emulator-5556 emu kill').closedPorts).toEqual([5556]);
  });
});

describe('extractEmulatorReferences', () => {
  it('keeps Bash references in order, with the time of the call', () => {
    const references: EmulatorReference[] = extractEmulatorReferences(
      calls(call('Bash', { command: 'adb -s emulator-5554 shell input tap 1 1' }, 'ok', 0), call('Bash', { command: 'adb -s emulator-5556 reverse tcp:8013 tcp:8013' }, '', 5)),
    );
    expect(references).toEqual([
      { port: 5554, avd: null, at: T0 },
      { port: 5556, avd: null, at: T0 + 5 * MINUTE_MS },
    ]);
  });

  it('ignores serials that only appear in a Bash result', () => {
    const references: EmulatorReference[] = extractEmulatorReferences(calls(call('Bash', { command: 'adb devices' }, 'emulator-5554\tdevice\nemulator-5556\tdevice')));
    expect(references).toEqual([]);
  });

  it('resolves MCP slots through the mapping the server reported, defaulting to slot 1', () => {
    const references: EmulatorReference[] = extractEmulatorReferences(
      calls(
        call('mcp__android-emulator__launch_emulator', { emulator: '2' }, 'Launching emulator 2 (Pixel 6a 2) on emulator-5558...'),
        call('mcp__android-emulator__tap', { emulator: '2', x: 1, y: 2 }, 'Tapped at (1, 2)'),
        call('mcp__android-emulator__screenshot', {}, null),
      ),
    );
    expect(references.map((reference: EmulatorReference) => reference.port)).toEqual([5558, 5558, 5554]);
  });

  it('never counts list_emulators, which names every slot', () => {
    const listed: string = 'Emulators:\n1: Pixel 6a 1 — Pixel_6a_1 (emulator-5554) [running]\n2: Pixel 6a 2 — Pixel_6a_2 (emulator-5556) [stopped]';
    expect(extractEmulatorReferences(calls(call('mcp__android-emulator__list_emulators', {}, listed)))).toEqual([]);
  });

  it('drops an emulator the chat closed again', () => {
    const references: EmulatorReference[] = extractEmulatorReferences(
      calls(
        call('mcp__android-emulator__tap', { emulator: '2', x: 1, y: 1 }, 'ok'),
        call('Bash', { command: 'adb -s emulator-5554 shell ls' }, ''),
        call('mcp__android-emulator__close_emulator', { emulator: '2' }, 'Emulator 2 (Pixel 6a 2) stopped'),
      ),
    );
    expect(references.map((reference: EmulatorReference) => reference.port)).toEqual([5554]);
  });
});

describe('extractBrowserTab', () => {
  const created: string =
    'Created new tab. Tab ID: 1143462222\n\nTab Context:\n- Executed on tabId: 1143462222\n- Available tabs:\n' +
    '  • tabId 1143462219: "Myrostr landscape | IcePanel App" ("https://app.icepanel.io/landscapes/3f")\n  • tabId 1143462222: "New Tab" ("")';

  it('takes the last tab used, with the latest title and URL the extension listed for it', () => {
    const tab: BrowserTabReference | null = extractBrowserTab(
      calls(
        call('mcp__claude-in-chrome__tabs_create_mcp', {}, created, 0),
        call('mcp__claude-in-chrome__navigate', { tabId: 1143462222, url: 'http://127.0.0.1:8077/docs' }, 'Navigated to http://127.0.0.1:8077/docs', 1),
        call(
          'mcp__claude-in-chrome__computer',
          { action: 'screenshot', tabId: 1143462222 },
          'Captured\n\nTab Context:\n- Executed on tabId: 1143462222\n- Available tabs:\n  • tabId 1143462222: "Swagger UI" ("http://127.0.0.1:8077/docs#/")',
          2,
        ),
      ),
    );
    expect(tab).toEqual({ tabId: 1143462222, title: 'Swagger UI', url: 'http://127.0.0.1:8077/docs#/', at: T0 + 2 * MINUTE_MS });
  });

  it('reads tab ids nested in a browser_batch', () => {
    const tab: BrowserTabReference | null = extractBrowserTab(
      calls(call('mcp__claude-in-chrome__browser_batch', { actions: [{ name: 'navigate', input: { tabId: 1143452559, url: 'https://example.com/a' } }] })),
    );
    expect(tab?.tabId).toBe(1143452559);
  });

  it('falls back to an earlier tab once the last one was closed, and to none when all were', () => {
    const first: TranscriptRecord[] = call('mcp__claude-in-chrome__navigate', { tabId: 1, url: 'https://one.test/' }, 'Navigated to https://one.test/');
    const second: TranscriptRecord[] = call('mcp__claude-in-chrome__navigate', { tabId: 2, url: 'https://two.test/' }, 'Navigated to https://two.test/');
    const closeSecond: TranscriptRecord[] = call('mcp__claude-in-chrome__tabs_close_mcp', { tabId: 2 }, 'Closed tab 2.');
    expect(extractBrowserTab(calls(first, second, closeSecond))?.url).toBe('https://one.test/');
    const closeFirst: TranscriptRecord[] = call('mcp__claude-in-chrome__tabs_close_mcp', { tabId: 1 }, 'Closed tab 1. Group is now empty (auto-removed).');
    expect(extractBrowserTab(calls(first, second, closeSecond, closeFirst))).toBeNull();
  });

  it('has no tab for a chat that never used Claude in Chrome', () => {
    expect(extractBrowserTab(calls(call('Bash', { command: 'ls' }, '')))).toBeNull();
  });
});
