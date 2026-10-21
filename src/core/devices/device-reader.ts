import { AGENT_READ_BYTES } from '../config';
import { FileMemo } from '../file-memo';
import { readTail } from '../file-reader';
import { isConversationLine, parseRecords } from '../jsonl';
import type { LineFilter } from '../jsonl';
import { extractBrowserTab } from './browser-tab-references';
import type { DeviceReferences } from './device-references';
import { NO_DEVICE_REFERENCES } from './device-references';
import { extractEmulatorReferences } from './emulator-references';
import type { ToolCall } from './tool-calls';
import { collectToolCalls } from './tool-calls';

// Only lines that can name an emulator or a Chrome tab get parsed; the rest of a long transcript is skipped cheaply.
const DEVICE_MARKERS: readonly string[] = ['emulator', 'adb ', 'run-android', 'run:android', 'claude-in-chrome', 'tabId', 'Tab ID', 'Closed tab'];

const isDeviceLine: LineFilter = (line: string): boolean =>
  isConversationLine(line) && DEVICE_MARKERS.some((marker: string) => line.includes(marker));

// The emulators and Chrome tab a chat worked with, re-read only when its transcript changes.
export class DeviceReferenceReader {
  private readonly references: FileMemo<DeviceReferences> = new FileMemo();

  async read(transcriptPath: string): Promise<DeviceReferences> {
    try {
      return await this.references.get(transcriptPath, async (): Promise<DeviceReferences> => {
        const calls: ToolCall[] = collectToolCalls(parseRecords((await readTail(transcriptPath, AGENT_READ_BYTES)).text, isDeviceLine));
        return { emulators: extractEmulatorReferences(calls), browserTab: extractBrowserTab(calls) };
      });
    } catch {
      return NO_DEVICE_REFERENCES;
    }
  }
}
