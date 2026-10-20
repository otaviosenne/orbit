import type { ShellSnapshot } from '../../shared/types';
import type { ContentBlock, TranscriptRecord } from '../transcript-record';
import { recordTime } from '../transcript-record';

interface BashCall {
  readonly command: string;
  readonly description: string | null;
  readonly calledAt: number | null;
}

// A queued task notification is written as its own record, with the text at the top level.
interface QueuedRecord extends TranscriptRecord {
  readonly content?: unknown;
}

const BASH_TOOL: string = 'Bash';
const STOP_TOOL: string = 'TaskStop';
// Every status a task notification reports once a background task is over.
const ENDED_STATUSES: ReadonlySet<string> = new Set(['completed', 'failed', 'killed', 'stopped']);
const NOTIFICATION: RegExp = /<task-notification>[\s\S]*?<task-id>([^<]+)<\/task-id>[\s\S]*?<status>([^<]+)<\/status>/g;

// Background shells still running at the end of these records: a Bash call whose result names a background task
// (run_in_background, or moved there by a timeout or a new message), until a notification or TaskStop ends it.
export function extractRunningShells(records: readonly TranscriptRecord[]): ShellSnapshot[] {
  const bashCalls: Map<string, BashCall> = new Map();
  const stopCalls: Set<string> = new Set();
  const running: Map<string, ShellSnapshot> = new Map();
  for (const record of records) {
    for (const block of contentBlocks(record)) {
      if (block.type === 'tool_use') rememberCall(record, block, bashCalls, stopCalls);
      else if (block.type === 'tool_result') applyResult(record, block, { bashCalls, stopCalls, running });
    }
    // Claude quoting a notification in its own reply does not end anything.
    if (record.type === 'assistant') continue;
    for (const taskId of endedTaskIds(recordText(record))) running.delete(taskId);
  }
  return [...running.values()];
}

interface ResultState {
  readonly bashCalls: ReadonlyMap<string, BashCall>;
  readonly stopCalls: ReadonlySet<string>;
  readonly running: Map<string, ShellSnapshot>;
}

function rememberCall(record: TranscriptRecord, block: ContentBlock, bashCalls: Map<string, BashCall>, stopCalls: Set<string>): void {
  if (block.id === undefined) return;
  if (block.name === STOP_TOOL) stopCalls.add(block.id);
  const command: unknown = block.input?.['command'];
  if (block.name !== BASH_TOOL || typeof command !== 'string') return;
  const description: unknown = block.input?.['description'];
  bashCalls.set(block.id, { command, description: typeof description === 'string' ? description : null, calledAt: recordTime(record) });
}

function applyResult(record: TranscriptRecord, block: ContentBlock, state: ResultState): void {
  const toolUseId: string | undefined = block.tool_use_id;
  if (toolUseId === undefined || block.is_error === true) return;
  const call: BashCall | undefined = state.bashCalls.get(toolUseId);
  const backgroundId: string | null = stringField(record.toolUseResult, 'backgroundTaskId');
  if (call !== undefined && backgroundId !== null) {
    state.running.set(backgroundId, {
      id: backgroundId,
      command: call.command,
      description: call.description,
      startedAt: call.calledAt ?? recordTime(record) ?? 0,
    });
  }
  const stoppedId: string | null = stringField(record.toolUseResult, 'task_id');
  if (state.stopCalls.has(toolUseId) && stoppedId !== null) state.running.delete(stoppedId);
}

function endedTaskIds(text: string): string[] {
  if (!text.includes('<task-notification>')) return [];
  return [...text.matchAll(NOTIFICATION)]
    .filter((match: RegExpMatchArray) => ENDED_STATUSES.has((match[2] ?? '').trim()))
    .map((match: RegExpMatchArray) => (match[1] ?? '').trim());
}

function contentBlocks(record: TranscriptRecord): readonly ContentBlock[] {
  const content = record.message?.content;
  return Array.isArray(content) ? content : [];
}

function recordText(record: QueuedRecord): string {
  const content = record.message?.content;
  if (typeof content === 'string') return content;
  if (typeof record.content === 'string') return record.content;
  return contentBlocks(record).map((block: ContentBlock) => (block.type === 'text' ? (block.text ?? '') : '')).join('\n');
}

function stringField(value: unknown, key: string): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const field: unknown = (value as Record<string, unknown>)[key];
  return typeof field === 'string' && field.length > 0 ? field : null;
}
