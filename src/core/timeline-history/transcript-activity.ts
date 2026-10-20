import { TIMELINE_MAX_HISTORY_MS } from '../../shared/time-span';
import type { TimeSpan } from '../../shared/types';
import type { LineFilter } from '../jsonl';
import { isColorLine, parseRecords } from '../jsonl';
import { searchTail } from '../tail-search';
import type { TailSearchResult } from '../tail-search';
import type { TranscriptRecord } from '../transcript-record';
import { lastAssistantAt } from './last-assistant';
import { reachesBack } from './tail-coverage';
import { turnSpans } from './turn-spans';

export interface TranscriptActivity {
  readonly turns: readonly TimeSpan[];
  readonly color: string | null;
}

const COLOR_RECORD_TYPE: string = 'agent-color';

// Turn ends, prompts and colors; tool results (the bulk of a transcript) never reach JSON.parse.
const isActivityLine: LineFilter = (line: string): boolean =>
  line.includes('"subtype":"turn_duration"') || isColorLine(line) || (line.includes('"type":"user"') && !line.includes('"tool_use_id"'));

// Anchored at the file's last write rather than at a requested window, so the result can be memoized per file
// version: every window the timeline can ask for ends after that write and starts within the widest range of it.
export async function readTranscriptActivity(path: string, lastWriteAt: number): Promise<TranscriptActivity> {
  const coverFrom: number = lastWriteAt - TIMELINE_MAX_HISTORY_MS;
  const text: string = await searchTail(path, (tail: string): TailSearchResult<string> => ({ value: tail, satisfied: reachesBack(tail, coverFrom) }));
  const records: TranscriptRecord[] = parseRecords(text, isActivityLine);
  return { turns: turnSpans(records, lastAssistantAt(text)), color: latestColor(records) };
}

// A color set before the tail that was read leaves the chat on the default tag, which is fine for a closed lane.
function latestColor(records: readonly TranscriptRecord[]): string | null {
  return records.filter((record: TranscriptRecord) => record.type === COLOR_RECORD_TYPE).at(-1)?.agentColor ?? null;
}
