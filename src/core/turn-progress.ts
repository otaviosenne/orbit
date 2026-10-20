import type { TurnProgress } from '../shared/types';
import type { TranscriptRecord } from './transcript-record';
import { hasToolResult, recordTime } from './transcript-record';

// How far the current turn has got: when it began (the last prompt) and how many tokens Claude has written since.
export function extractTurnProgress(records: readonly TranscriptRecord[]): TurnProgress | null {
  const promptIndex: number = records.findLastIndex(isPrompt);
  if (promptIndex === -1) return null;
  const prompt: TranscriptRecord | undefined = records[promptIndex];
  const startedAt: number | null = prompt === undefined ? null : recordTime(prompt);
  if (startedAt === null) return null;
  return { startedAt, outputTokens: outputTokensAfter(records.slice(promptIndex + 1)) };
}

function isPrompt(record: TranscriptRecord): boolean {
  return record.type === 'user' && record.isMeta !== true && record.isSidechain !== true && !hasToolResult(record);
}

// One API response is logged as several records (one per content block) that repeat its usage; count each once.
function outputTokensAfter(records: readonly TranscriptRecord[]): number {
  const perMessage: Map<string, number> = new Map();
  for (const record of records) {
    const id: string | undefined = record.message?.id;
    const tokens: number | undefined = record.message?.usage?.output_tokens;
    if (record.type === 'assistant' && record.isSidechain !== true && id !== undefined && tokens !== undefined) {
      perMessage.set(id, Math.max(perMessage.get(id) ?? 0, tokens));
    }
  }
  return [...perMessage.values()].reduce((sum: number, tokens: number) => sum + tokens, 0);
}
