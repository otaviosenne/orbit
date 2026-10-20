import type { TranscriptRecord } from './transcript-record';
import { hasToolResult, isConversationRecord, recordTime } from './transcript-record';

export interface AgentFacts {
  readonly endedCleanly: boolean;
  readonly firstPromptAt: number | null;
  readonly runStartedAt: number | null;
  readonly lastRecordAt: number | null;
}

const CLEAN_STOP_REASON: string = 'end_turn';

export function extractAgentFacts(records: readonly TranscriptRecord[]): AgentFacts {
  const conversation: TranscriptRecord[] = records.filter(isConversationRecord);
  const last: TranscriptRecord | undefined = conversation.at(-1);
  const runStart: TranscriptRecord | undefined = findCurrentRunStart(conversation);
  const firstPrompt: TranscriptRecord | undefined = conversation.find(isPrompt);
  return {
    endedCleanly: last !== undefined && isCleanStop(last),
    firstPromptAt: firstPrompt === undefined ? null : recordTime(firstPrompt),
    runStartedAt: runStart === undefined ? null : recordTime(runStart),
    lastRecordAt: last === undefined ? null : recordTime(last),
  };
}

// Agents get resumed after finishing, and coordinators inject messages mid-run, so the current run
// begins at the first prompt after the previous clean stop rather than at the latest prompt.
function findCurrentRunStart(conversation: readonly TranscriptRecord[]): TranscriptRecord | undefined {
  let runStart: TranscriptRecord | undefined;
  let awaitingNewRun: boolean = true;
  for (const [index, record] of conversation.entries()) {
    if (awaitingNewRun && isPrompt(record)) {
      runStart = record;
      awaitingNewRun = false;
    }
    if (isCleanStop(record) && index < conversation.length - 1) awaitingNewRun = true;
  }
  return runStart;
}

function isPrompt(record: TranscriptRecord): boolean {
  return record.type === 'user' && !hasToolResult(record);
}

function isCleanStop(record: TranscriptRecord): boolean {
  return record.type === 'assistant' && record.message?.stop_reason === CLEAN_STOP_REASON;
}
