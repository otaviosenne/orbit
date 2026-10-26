import type { ShellSnapshot } from '../../shared/types';
import type { ContentBlock, TranscriptRecord } from '../transcript-record';
import { recordTime } from '../transcript-record';
import type { TaskEnd } from './task-notifications';
import { parseTaskEnds } from './task-notifications';

// A shell as the main process knows it: what the panel shows, plus where Claude Code writes its output.
export interface ShellRecord extends ShellSnapshot {
  readonly outputFile: string | null;
  // A monitor that runs out its timeout leaves no mark in the transcript, so its end is worked out from this.
  readonly expiresAt: number | null;
}

interface BashCall {
  readonly isMonitor: boolean;
  readonly command: string;
  readonly description: string | null;
  readonly calledAt: number | null;
}

// A queued task notification is written as its own record, with the text at the top level.
interface QueuedRecord extends TranscriptRecord {
  readonly content?: unknown;
}

interface ExtractState {
  readonly bashCalls: Map<string, BashCall>;
  readonly stopCalls: Set<string>;
  readonly shells: Map<string, ShellRecord>;
}

const BASH_TOOL: string = 'Bash';
// The Monitor tool watches a command in the background and reports each line it prints; it is a shell for this purpose.
const MONITOR_TOOL: string = 'Monitor';
const STOP_TOOL: string = 'TaskStop';
const OUTPUT_FILE: RegExp = /Output is being written to: (\S+?\.output)\b/;

// Every background shell in these records: a Bash call whose result names a background task (run_in_background,
// or moved there by a timeout or a new message), running until a task notification or a TaskStop result ends it.
export function extractShells(records: readonly TranscriptRecord[]): ShellRecord[] {
  const state: ExtractState = { bashCalls: new Map(), stopCalls: new Set(), shells: new Map() };
  for (const record of records) {
    for (const block of contentBlocks(record)) {
      if (block.type === 'tool_use') rememberCall(record, block, state);
      else if (block.type === 'tool_result') applyResult(record, block, state);
    }
    // Claude quoting a notification in its own reply does not end anything.
    if (record.type !== 'assistant') for (const end of parseTaskEnds(recordText(record))) applyEnd(record, end, state);
  }
  return [...state.shells.values()];
}

function rememberCall(record: TranscriptRecord, block: ContentBlock, state: ExtractState): void {
  if (block.id === undefined) return;
  if (block.name === STOP_TOOL) state.stopCalls.add(block.id);
  const command: unknown = block.input?.['command'];
  if ((block.name !== BASH_TOOL && block.name !== MONITOR_TOOL) || typeof command !== 'string') return;
  const description: unknown = block.input?.['description'];
  state.bashCalls.set(block.id, { isMonitor: block.name === MONITOR_TOOL, command, description: typeof description === 'string' ? description : null, calledAt: recordTime(record) });
}

function applyResult(record: TranscriptRecord, block: ContentBlock, state: ExtractState): void {
  const toolUseId: string | undefined = block.tool_use_id;
  if (toolUseId === undefined || block.is_error === true) return;
  const call: BashCall | undefined = state.bashCalls.get(toolUseId);
  // A monitor's result names its task as taskId; a plain background command's as backgroundTaskId.
  const backgroundId: string | null = stringField(record.toolUseResult, call?.isMonitor === true ? 'taskId' : 'backgroundTaskId');
  if (call !== undefined && backgroundId !== null) state.shells.set(backgroundId, startedShell(backgroundId, call, record, block));
  const stoppedId: string | null = stringField(record.toolUseResult, 'task_id');
  if (state.stopCalls.has(toolUseId) && stoppedId !== null) applyEnd(record, { taskId: stoppedId, status: 'killed', exitCode: null, outputFile: null }, state);
}

function startedShell(id: string, call: BashCall, record: TranscriptRecord, block: ContentBlock): ShellRecord {
  const startedAt: number = call.calledAt ?? recordTime(record) ?? 0;
  return {
    id,
    command: call.command,
    description: call.description,
    startedAt,
    status: 'running',
    endedAt: null,
    exitCode: null,
    outputFile: OUTPUT_FILE.exec(blockText(block))?.[1] ?? null,
    expiresAt: call.isMonitor ? monitorExpiry(startedAt, record.toolUseResult) : null,
  };
}

// A monitor lasts its timeout unless it is persistent, which only a TaskStop or the chat ending stops.
function monitorExpiry(startedAt: number, result: unknown): number | null {
  if (typeof result !== 'object' || result === null) return null;
  const { timeoutMs, persistent } = result as { readonly timeoutMs?: unknown; readonly persistent?: unknown };
  return persistent === true || typeof timeoutMs !== 'number' ? null : startedAt + timeoutMs;
}

// The queued copy of a notification comes before the one the chat takes in; the first one marks the end.
function applyEnd(record: TranscriptRecord, end: TaskEnd, state: ExtractState): void {
  const shell: ShellRecord | undefined = state.shells.get(end.taskId);
  if (shell === undefined || shell.status !== 'running') return;
  state.shells.set(end.taskId, {
    ...shell,
    status: end.status,
    endedAt: recordTime(record) ?? shell.startedAt,
    exitCode: end.exitCode,
    outputFile: shell.outputFile ?? end.outputFile,
  });
}

function contentBlocks(record: TranscriptRecord): readonly ContentBlock[] {
  const content = record.message?.content;
  return Array.isArray(content) ? content : [];
}

function blockText(block: ContentBlock): string {
  if (typeof block.content === 'string') return block.content;
  return (block.content ?? []).map((inner: ContentBlock) => inner.text ?? '').join('\n');
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
