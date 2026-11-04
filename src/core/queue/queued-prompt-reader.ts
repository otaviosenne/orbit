import type { MessageItem } from '../../shared/types';
import { FileMemo } from '../file-memo';
import { isNoiseText } from '../harness-text';
import { parseRecords } from '../jsonl';
import { withoutPastedWrappers } from '../pasted-content';
import { parseSlashCommand, parseTaskNotification } from '../tagged-text';
import type { TailSearchResult } from '../tail-search';
import { searchTail } from '../tail-search';
import type { TranscriptRecord } from '../transcript-record';
import { recordTime } from '../transcript-record';
import type { QueueOperation, QueuedPrompt } from './prompt-queue';
import { openQueue } from './prompt-queue';

const QUEUE_OPERATION: string = 'queue-operation';
const TURN_END: string = 'turn_duration';
const POP_ALL: string = 'popAll';
// A slash command waits in the queue as typed ("/model opus"), not in the tags the transcript later wraps it in.
const TYPED_COMMAND: RegExp = /^\/[\w:-]+(\s|$)/;

const isQueueLine = (line: string): boolean => line.includes(`"type":"${QUEUE_OPERATION}"`) || line.includes(`"subtype":"${TURN_END}"`);

// The prompts waiting in a live chat's queue. Read again only once the transcript grows, since a busy chat is
// polled every couple of seconds.
export class QueuedPromptReader {
  private readonly memo: FileMemo<QueuedPrompt[]> = new FileMemo();

  // `since` is when the chat's process started: Claude Code does not bring a queue back on resume, so whatever an
  // earlier process left queued is gone.
  read(transcriptPath: string, since: number): Promise<QueuedPrompt[]> {
    return this.memo.get(transcriptPath, (): Promise<QueuedPrompt[]> => searchTail(transcriptPath, (text: string) => queueInTail(text, since)));
  }
}

// The queued prompts that are the user's own messages, as the thread shows them until the chat takes them in.
export function queuedMessages(prompts: readonly QueuedPrompt[]): MessageItem[] {
  return prompts.flatMap(toMessage);
}

// What was typed, without the wrapper Claude Code puts around a paste.
function typedText(prompt: QueuedPrompt): string {
  return withoutPastedWrappers(prompt.content).trim();
}

// The prompts the chat pulled back into its input since `since`, in queue order: what an Up press took out.
export function poppedPrompts(text: string, since: number): string[] {
  return parseRecords(text, isQueueLine)
    .filter(isQueueOperation)
    .map(operationOf)
    .filter((step: QueueOperation) => step.operation === POP_ALL && step.at >= since && step.content !== null)
    .map((step: QueueOperation) => step.content as string);
}

// A finished turn dequeues whatever waited for it, so only what came after the last one can still be queued.
function queueInTail(text: string, since: number): TailSearchResult<QueuedPrompt[]> {
  const records: TranscriptRecord[] = parseRecords(text, isQueueLine);
  const boundary: number = records.findLastIndex((record: TranscriptRecord) => record.subtype === TURN_END || (recordTime(record) ?? 0) < since);
  const operations: QueueOperation[] = records.slice(boundary + 1).filter(isQueueOperation).map(operationOf);
  return { value: openQueue(operations), satisfied: boundary >= 0 };
}

function isQueueOperation(record: TranscriptRecord): boolean {
  return record.type === QUEUE_OPERATION && typeof record.operation === 'string';
}

function operationOf(record: TranscriptRecord): QueueOperation {
  return { operation: record.operation ?? '', content: typeof record.content === 'string' ? record.content : null, at: recordTime(record) ?? 0 };
}

// Task notifications and slash commands wait in the same queue but are not messages from the user.
function toMessage(prompt: QueuedPrompt, index: number): MessageItem[] {
  const text: string = typedText(prompt);
  if (text.length === 0 || TYPED_COMMAND.test(text) || parseSlashCommand(text) !== null || parseTaskNotification(text) !== null || isNoiseText(text)) return [];
  return [{ kind: 'message', id: `queued-prompt-${prompt.enqueuedAt}-${index}`, timestamp: prompt.enqueuedAt, role: 'user', text, images: [], isQueued: true }];
}
