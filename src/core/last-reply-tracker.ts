import { fileSize, readCompleteLinesFrom } from './file-reader';
import type { RangeText } from './file-reader';
import { parseRecords } from './jsonl';
import type { LineFilter } from './jsonl';
import { searchTail } from './tail-search';
import type { TailSearchResult } from './tail-search';
import type { TranscriptRecord } from './transcript-record';
import { recordTime } from './transcript-record';

interface ReplyState {
  lastReplyAt: number | null;
  scannedUpTo: number;
}

const isAssistantLine: LineFilter = (line: string): boolean => line.includes('"type":"assistant"');

// When Claude last wrote in a chat. Unlike the session's status time, it does not move when the chat is only
// reopened (a resume after a reboot), so "new since you looked" and Active/Idle follow real replies.
// After one tail search, only newly appended bytes are scanned.
export class LastReplyTracker {
  private readonly states: Map<string, ReplyState> = new Map();

  async lastReplyAt(transcriptPath: string): Promise<number | null> {
    const state: ReplyState = this.states.get(transcriptPath) ?? (await this.initialState(transcriptPath));
    this.states.set(transcriptPath, state);
    await this.scanAppended(transcriptPath, state);
    return state.lastReplyAt;
  }

  private async initialState(transcriptPath: string): Promise<ReplyState> {
    const scannedUpTo: number = await fileSize(transcriptPath);
    const lastReplyAt: number | null = await searchTail(transcriptPath, findLatestReplyResult);
    return { lastReplyAt, scannedUpTo };
  }

  private async scanAppended(transcriptPath: string, state: ReplyState): Promise<void> {
    const appended: RangeText = await readCompleteLinesFrom(transcriptPath, state.scannedUpTo);
    state.scannedUpTo += appended.consumedBytes;
    state.lastReplyAt = findLatestReply(appended.text) ?? state.lastReplyAt;
  }
}

function findLatestReplyResult(text: string): TailSearchResult<number | null> {
  const lastReplyAt: number | null = findLatestReply(text);
  return { value: lastReplyAt, satisfied: lastReplyAt !== null };
}

export function findLatestReply(text: string): number | null {
  const times: number[] = parseRecords(text, isAssistantLine)
    .filter((record: TranscriptRecord) => record.type === 'assistant' && record.isSidechain !== true)
    .map(recordTime)
    .filter((time: number | null): time is number => time !== null);
  return times.length === 0 ? null : Math.max(...times);
}
