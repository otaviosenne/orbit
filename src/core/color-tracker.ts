import { fileSize, readCompleteLinesFrom } from './file-reader';
import type { RangeText } from './file-reader';
import { isColorLine, parseRecords } from './jsonl';
import { searchTail } from './tail-search';
import type { TailSearchResult } from './tail-search';
import type { TranscriptRecord } from './transcript-record';

interface ColorState {
  color: string | null;
  scannedUpTo: number;
}

// The color is set by /color and re-logged often; after one tail search only newly appended bytes are scanned.
export class ColorTracker {
  private readonly states: Map<string, ColorState> = new Map();

  async colorOf(transcriptPath: string): Promise<string | null> {
    const state: ColorState = this.states.get(transcriptPath) ?? (await this.initialState(transcriptPath));
    this.states.set(transcriptPath, state);
    await this.scanAppended(transcriptPath, state);
    return state.color;
  }

  private async initialState(transcriptPath: string): Promise<ColorState> {
    const scannedUpTo: number = await fileSize(transcriptPath);
    const color: string | null = await searchTail(transcriptPath, findLatestColorResult);
    return { color, scannedUpTo };
  }

  private async scanAppended(transcriptPath: string, state: ColorState): Promise<void> {
    const appended: RangeText = await readCompleteLinesFrom(transcriptPath, state.scannedUpTo);
    state.scannedUpTo += appended.consumedBytes;
    state.color = findLatestColor(appended.text) ?? state.color;
  }
}

function findLatestColorResult(text: string): TailSearchResult<string | null> {
  const color: string | null = findLatestColor(text);
  return { value: color, satisfied: color !== null };
}

function findLatestColor(text: string): string | null {
  const records: TranscriptRecord[] = parseRecords(text, isColorLine).filter(
    (record: TranscriptRecord) => record.type === 'agent-color',
  );
  return records.at(-1)?.agentColor ?? null;
}
