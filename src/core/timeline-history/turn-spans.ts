import { mergeSpans } from '../../shared/time-span';
import type { TimeSpan } from '../../shared/types';
import { isRealPrompt } from '../past-chats/session-summary';
import { INTERRUPTION_PREFIX } from '../harness-text';
import { parseTaskNotification } from '../tagged-text';
import { contentText } from '../transcript-extractor';
import type { TranscriptRecord } from '../transcript-record';
import { recordTime } from '../transcript-record';

const TURN_DURATION_SUBTYPE: string = 'turn_duration';

// Claude Code logs each finished turn's length when it ends. An interrupted turn has no such record, so it lasts
// from its prompt to the interruption; one still running when the chat was closed lasts until Claude last wrote,
// since the file itself keeps being written (titles, the exit) after the work stopped.
export function turnSpans(records: readonly TranscriptRecord[], lastAssistantAt: number | null): TimeSpan[] {
  const spans: TimeSpan[] = [];
  let unfinishedSince: number | null = null;
  for (const record of records) {
    const time: number | null = recordTime(record);
    if (time === null) continue;
    if (isTurnDuration(record)) {
      spans.push({ start: time - record.durationMs, end: time });
      unfinishedSince = null;
    } else if (isInterruption(record)) {
      if (unfinishedSince !== null && time > unfinishedSince) spans.push({ start: unfinishedSince, end: time });
      unfinishedSince = null;
    } else if (unfinishedSince === null && startsTurn(record)) {
      unfinishedSince = time;
    }
  }
  if (unfinishedSince !== null && lastAssistantAt !== null && lastAssistantAt > unfinishedSince) {
    spans.push({ start: unfinishedSince, end: lastAssistantAt });
  }
  return mergeSpans(spans);
}

function isTurnDuration(record: TranscriptRecord): record is TranscriptRecord & { readonly durationMs: number } {
  return record.subtype === TURN_DURATION_SUBTYPE && record.isSidechain !== true && typeof record.durationMs === 'number';
}

function isInterruption(record: TranscriptRecord): boolean {
  return record.type === 'user' && record.isSidechain !== true && contentText(record).trim().startsWith(INTERRUPTION_PREFIX);
}

// A person's prompt or a background task's report: both set Claude working.
function startsTurn(record: TranscriptRecord): boolean {
  if (record.type !== 'user' || record.isSidechain === true) return false;
  return isRealPrompt(record) || parseTaskNotification(contentText(record).trim()) !== null;
}
