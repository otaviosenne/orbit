import { firstLine } from '../clip-text';
import { COMPACTION_PREFIX, isNoiseText } from '../harness-text';
import type { LineFilter } from '../jsonl';
import { parseSlashCommand, parseTaskNotification } from '../tagged-text';
import { contentText } from '../transcript-extractor';
import type { TranscriptRecord } from '../transcript-record';
import { hasToolResult } from '../transcript-record';

// The fields a past chat is listed by; they sit on records the live transcript reader never needs.
export interface SessionMetaRecord extends TranscriptRecord {
  readonly cwd?: string;
  readonly entrypoint?: string;
  readonly customTitle?: string;
  readonly agentName?: string;
  readonly aiTitle?: string;
}

export interface SessionSummary {
  readonly title: string | null;
  // Where the chat was started: `claude --resume` only finds it from that same folder.
  readonly cwd: string | null;
  readonly isChat: boolean;
}

const TITLE_MAX_CHARS: number = 100;
// `claude -p` and SDK runs (such as Orbit's own triage) write transcripts too, but nobody chats in them.
const SCRIPTED_ENTRYPOINT: string = 'sdk-cli';
const PEER_ORIGIN: string = 'peer';
const TITLE_TYPES: readonly string[] = ['custom-title', 'agent-name', 'ai-title'];

export const isSessionMetaLine: LineFilter = (line: string): boolean =>
  line.includes('"type":"user"') || line.includes('"cwd"') || TITLE_TYPES.some((type: string) => line.includes(`"type":"${type}"`));

// Head records come first in the file, tail records last; together they stand in for the whole transcript.
export function summarizeSession(head: readonly SessionMetaRecord[], tail: readonly SessionMetaRecord[]): SessionSummary {
  const records: readonly SessionMetaRecord[] = [...head, ...tail];
  const title: string | null = chosenTitle(records) ?? firstPrompt(head) ?? firstPrompt(tail);
  return {
    // A first prompt too big to parse from the head (a pasted image) still leaves a title behind.
    title: title === null ? null : firstLine(title, TITLE_MAX_CHARS),
    cwd: firstValue(records, (record: SessionMetaRecord) => record.cwd),
    isChat: !isScripted(records) && title !== null,
  };
}

// The name the user gave wins, then the chat's agent name, then Claude's own summary.
function chosenTitle(records: readonly SessionMetaRecord[]): string | null {
  return (
    lastValue(records, (record: SessionMetaRecord) => record.customTitle) ??
    lastValue(records, (record: SessionMetaRecord) => record.agentName) ??
    lastValue(records, (record: SessionMetaRecord) => record.aiTitle)
  );
}

function firstPrompt(records: readonly SessionMetaRecord[]): string | null {
  for (const record of records) {
    const text: string | null = promptText(record);
    if (text !== null) return text;
  }
  return null;
}

// What started a turn: something a person typed, or a task another chat sent over.
export function promptText(record: TranscriptRecord): string | null {
  if (record.type !== 'user' || record.isSidechain === true) return null;
  if (record.origin?.kind === PEER_ORIGIN) return record.origin.body?.trim() || null;
  return isRealPrompt(record) ? contentText(record).trim() : null;
}

// Something a person typed, as opposed to tool results, slash commands and text the harness injects.
export function isRealPrompt(record: TranscriptRecord): boolean {
  if (record.type !== 'user' || record.isMeta === true || record.isSidechain === true || record.isCompactSummary === true) return false;
  if (hasToolResult(record)) return false;
  const text: string = contentText(record).trim();
  if (text.length === 0 || isNoiseText(text) || text.startsWith(COMPACTION_PREFIX)) return false;
  return parseSlashCommand(text) === null && parseTaskNotification(text) === null;
}

function isScripted(records: readonly SessionMetaRecord[]): boolean {
  return firstValue(records, (record: SessionMetaRecord) => record.entrypoint) === SCRIPTED_ENTRYPOINT;
}

type FieldOf = (record: SessionMetaRecord) => string | undefined;

function firstValue(records: readonly SessionMetaRecord[], field: FieldOf): string | null {
  for (const record of records) {
    const value: string | undefined = field(record);
    if (value !== undefined && value.length > 0) return value;
  }
  return null;
}

function lastValue(records: readonly SessionMetaRecord[], field: FieldOf): string | null {
  return firstValue([...records].reverse(), field);
}
