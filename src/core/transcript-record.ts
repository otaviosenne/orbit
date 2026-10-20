export interface ContentBlock {
  readonly type: string;
  readonly text?: string;
  readonly id?: string;
  readonly name?: string;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly tool_use_id?: string;
  readonly content?: string | readonly ContentBlock[];
  readonly is_error?: boolean;
  readonly source?: { readonly media_type?: string; readonly data?: string };
}

export interface RecordOrigin {
  readonly kind?: string;
  readonly name?: string;
  readonly body?: string;
}

export interface TranscriptRecord {
  readonly type: string;
  readonly uuid?: string;
  readonly subtype?: string;
  readonly timestamp?: string;
  readonly isSidechain?: boolean;
  readonly isMeta?: boolean;
  readonly isCompactSummary?: boolean;
  readonly agentColor?: string;
  readonly durationMs?: number;
  readonly origin?: RecordOrigin;
  // The [Image #N] numbers of the image blocks in this record, in order.
  readonly imagePasteIds?: readonly number[];
  // Claude Code's structured copy of a tool result; AskUserQuestion keeps its per-question answers here.
  readonly toolUseResult?: unknown;
  // The reasoning effort an assistant reply was made with.
  readonly effort?: string;
  // Logged on `permission-mode` records and on the user's prompts.
  readonly permissionMode?: string;
  readonly message?: {
    readonly id?: string;
    readonly model?: string;
    readonly usage?: { readonly output_tokens?: number };
    readonly role?: string;
    readonly content?: string | readonly ContentBlock[];
    readonly stop_reason?: string | null;
  };
}

export function isConversationRecord(record: TranscriptRecord): boolean {
  return record.type === 'user' || record.type === 'assistant';
}

export function recordTime(record: TranscriptRecord): number | null {
  if (record.timestamp === undefined) return null;
  const parsed: number = Date.parse(record.timestamp);
  return Number.isNaN(parsed) ? null : parsed;
}

export function hasToolResult(record: TranscriptRecord): boolean {
  const content = record.message?.content;
  return Array.isArray(content) && content.some((block: ContentBlock) => block.type === 'tool_result');
}
