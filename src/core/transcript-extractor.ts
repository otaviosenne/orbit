import type { MessageImage, NoticeTone, QuestionItem, ToolItem, TranscriptItem } from '../shared/types';
import { clipText } from './clip-text';
import { MAX_TOOL_TEXT_CHARS } from './config';
import { COMPACTION_PREFIX, isNoiseText } from './harness-text';
import { ASK_USER_QUESTION_TOOL } from './questions/question-input';
import { QuestionTracker } from './questions/question-tracker';
import type { TaskNotification } from './tagged-text';
import { parseSlashCommand, parseTaskNotification } from './tagged-text';
import type { ToolInput } from './tool-summary';
import { describeToolInput, displayToolName, summarizeTool } from './tool-summary';
import type { ContentBlock, TranscriptRecord } from './transcript-record';
import { recordTime } from './transcript-record';

// Maps the pid of another chat's process to that chat's name.
export type ChatNameResolver = (pid: number) => string | null;

export interface ImageBlob {
  readonly mediaType: string;
  readonly data: string;
}

// Image pixels by MessageImage key; kept out of the items so polling does not move megabytes around.
export type ImageStore = Map<string, ImageBlob>;

type MutableTool = { -readonly [K in keyof ToolItem]: ToolItem[K] };

const PEER_SOCKET: RegExp = /cc-socks\/(\d+)\.sock$/;
const SEND_MESSAGE_TOOL: string = 'SendMessage';
const FAILED_STATUS: string = 'failed';
const UNKNOWN_CHAT: string = 'another chat';
const IMAGE_PLACEHOLDER: string = '[image]';

// A chat's own transcript hides the sidechain (its agents' work); an agent's transcript is all sidechain.
export type TranscriptSource = 'chat' | 'agent';

// Turns raw transcript records into what the panel shows: messages, tool calls, chat-to-chat messages, notices.
export function extractTranscript(
  records: readonly TranscriptRecord[],
  limit: number,
  resolveChat: ChatNameResolver,
  images: ImageStore = new Map(),
  source: TranscriptSource = 'chat',
): TranscriptItem[] {
  const builder: TranscriptBuilder = new TranscriptBuilder(resolveChat, images, source);
  records.forEach((record: TranscriptRecord, index: number) => builder.add(record, index));
  return builder.items.slice(-limit);
}

class TranscriptBuilder {
  readonly items: TranscriptItem[] = [];
  private readonly tools: Map<string, MutableTool> = new Map();
  private readonly questions: QuestionTracker = new QuestionTracker();

  constructor(
    private readonly resolveChat: ChatNameResolver,
    private readonly images: ImageStore,
    private readonly source: TranscriptSource,
  ) {}

  add(record: TranscriptRecord, index: number): void {
    if (record.isSidechain === true && this.source === 'chat') return;
    const id: string = record.uuid ?? `record-${index}`;
    const timestamp: number = recordTime(record) ?? 0;
    if (record.type === 'system') this.addSystem(record, id, timestamp);
    else if (record.type === 'assistant') this.addAssistant(record, id, timestamp);
    else if (record.type === 'user') this.addUser(record, id, timestamp);
  }

  private addSystem(record: TranscriptRecord, id: string, timestamp: number): void {
    if (record.subtype === 'turn_duration' && record.durationMs !== undefined) {
      this.questions.expireOpen();
      this.items.push({ kind: 'turn', id, timestamp, durationMs: record.durationMs });
    }
  }

  private addAssistant(record: TranscriptRecord, id: string, timestamp: number): void {
    contentBlocks(record).forEach((block: ContentBlock, index: number) => {
      const text: string = block.text?.trim() ?? '';
      if (block.type === 'text' && text.length > 0) this.items.push({ kind: 'message', id: `${id}-${index}`, timestamp, role: 'assistant', text, images: [] });
      if (block.type === 'tool_use') this.addToolUse(block, `${id}-${index}`, timestamp);
    });
  }

  private addToolUse(block: ContentBlock, fallbackId: string, timestamp: number): void {
    const name: string = block.name ?? 'tool';
    const input: ToolInput = block.input ?? {};
    const id: string = block.id ?? fallbackId;
    if (name === SEND_MESSAGE_TOOL) {
      this.items.push({ kind: 'peer', id, timestamp, direction: 'out', chat: this.chatNamed(input['to']), text: outgoingText(input) });
      return;
    }
    if (name === ASK_USER_QUESTION_TOOL && this.addQuestion(id, timestamp, input)) return;
    const tool: MutableTool = {
      kind: 'tool', id, timestamp, name: displayToolName(name), summary: summarizeTool(name, input),
      input: describeToolInput(name, input), output: null, isError: false,
    };
    this.tools.set(id, tool);
    this.items.push(tool);
  }

  private addQuestion(id: string, timestamp: number, input: ToolInput): boolean {
    const question: QuestionItem | null = this.questions.ask(id, timestamp, input);
    if (question !== null) this.items.push(question);
    return question !== null;
  }

  private addUser(record: TranscriptRecord, id: string, timestamp: number): void {
    const blocks: readonly ContentBlock[] = contentBlocks(record);
    if (blocks.some((block: ContentBlock) => block.type === 'tool_result')) return blocks.forEach((block: ContentBlock) => this.attachResult(block, record));
    if (record.origin?.kind === 'peer') {
      this.items.push({ kind: 'peer', id, timestamp, direction: 'in', chat: record.origin.name ?? UNKNOWN_CHAT, text: record.origin.body ?? contentText(record) });
      return;
    }
    const text: string = contentText(record).trim();
    const task: TaskNotification | null = parseTaskNotification(text);
    if (task !== null) return this.addNotice(id, timestamp, task.status === FAILED_STATUS ? 'error' : 'info', task.summary ?? 'Agent update', task.result);
    if (record.isMeta === true || text.length === 0) return;
    if (record.isCompactSummary === true || text.startsWith(COMPACTION_PREFIX)) return this.addCompaction(id, timestamp, text);
    const command: string | null = parseSlashCommand(text);
    if (command !== null) return this.addNotice(id, timestamp, 'info', command, null);
    if (isNoiseText(text)) return;
    this.questions.expireOpen();
    this.items.push({ kind: 'message', id, timestamp, role: 'user', text, images: this.storeImages(record, id) });
  }

  private addCompaction(id: string, timestamp: number, text: string): void {
    this.questions.expireOpen();
    this.addNotice(id, timestamp, 'info', 'Conversation compacted', clipText(text, MAX_TOOL_TEXT_CHARS));
  }

  // Pairs each image block with its [Image #N] number (imagePasteIds, in block order).
  private storeImages(record: TranscriptRecord, id: string): MessageImage[] {
    const blocks: ContentBlock[] = contentBlocks(record).filter((block: ContentBlock) => block.type === 'image');
    return blocks.flatMap((block: ContentBlock, index: number): MessageImage[] => {
      const data: string | undefined = block.source?.data;
      if (data === undefined) return [];
      const number: number = record.imagePasteIds?.[index] ?? index + 1;
      const key: string = `${id}#${number}`;
      this.images.set(key, { mediaType: block.source?.media_type ?? 'image/png', data });
      return [{ number, key }];
    });
  }

  private attachResult(block: ContentBlock, record: TranscriptRecord): void {
    if (block.tool_use_id === undefined) return;
    const text: string = clipText(resultText(block.content), MAX_TOOL_TEXT_CHARS);
    const isError: boolean = block.is_error === true;
    if (this.questions.resolve(block.tool_use_id, { isError, text, toolUseResult: record.toolUseResult })) return;
    const tool: MutableTool | undefined = this.tools.get(block.tool_use_id);
    if (tool === undefined) return;
    tool.output = text;
    tool.isError = isError;
  }

  private addNotice(id: string, timestamp: number, tone: NoticeTone, title: string, detail: string | null): void {
    this.items.push({ kind: 'notice', id, timestamp, tone, title, detail });
  }

  // SendMessage targets look like "uds:/run/user/1000/cc-socks/5604.sock"; the pid names the chat.
  private chatNamed(target: unknown): string {
    if (typeof target !== 'string') return UNKNOWN_CHAT;
    const pid: string | undefined = target.match(PEER_SOCKET)?.[1];
    if (pid === undefined) return target;
    return this.resolveChat(Number(pid)) ?? UNKNOWN_CHAT;
  }
}

function contentBlocks(record: TranscriptRecord): readonly ContentBlock[] {
  const content = record.message?.content;
  return Array.isArray(content) ? content : [];
}

export function contentText(record: TranscriptRecord): string {
  const content = record.message?.content;
  if (typeof content === 'string') return content;
  return contentBlocks(record)
    .filter((block: ContentBlock) => block.type === 'text')
    .map((block: ContentBlock) => block.text ?? '')
    .join('\n');
}

function resultText(content: string | readonly ContentBlock[] | undefined): string {
  if (content === undefined) return '';
  if (typeof content === 'string') return content;
  return content.map((block: ContentBlock) => (block.type === 'text' ? (block.text ?? '') : IMAGE_PLACEHOLDER)).join('\n');
}

function outgoingText(input: ToolInput): string {
  const message: unknown = input['message'] ?? input['summary'];
  return typeof message === 'string' ? message : JSON.stringify(message ?? '');
}
