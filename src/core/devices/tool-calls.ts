import type { ContentBlock, TranscriptRecord } from '../transcript-record';
import { recordTime } from '../transcript-record';

// One tool call as the device extractors need it: its input when made, and its result text once it arrived.
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly at: number;
  readonly resultText: string | null;
}

// Tool calls in transcript order, each paired with the text of its result (null while it runs or if it failed).
export function collectToolCalls(records: readonly TranscriptRecord[]): ToolCall[] {
  const calls: ToolCall[] = [];
  const byId: Map<string, number> = new Map();
  for (const record of records) {
    for (const block of contentBlocks(record)) {
      if (block.type === 'tool_use' && block.id !== undefined && block.name !== undefined) {
        byId.set(block.id, calls.length);
        calls.push({ id: block.id, name: block.name, input: block.input ?? {}, at: recordTime(record) ?? 0, resultText: null });
      } else if (block.type === 'tool_result' && block.tool_use_id !== undefined && block.is_error !== true) {
        attachResult(calls, byId.get(block.tool_use_id), blockText(block.content));
      }
    }
  }
  return calls;
}

function attachResult(calls: ToolCall[], index: number | undefined, text: string): void {
  const call: ToolCall | undefined = index === undefined ? undefined : calls[index];
  if (index !== undefined && call !== undefined) calls[index] = { ...call, resultText: text };
}

function contentBlocks(record: TranscriptRecord): readonly ContentBlock[] {
  const content = record.message?.content;
  return Array.isArray(content) ? content : [];
}

function blockText(content: string | readonly ContentBlock[] | undefined): string {
  if (typeof content === 'string') return content;
  if (content === undefined) return '';
  return content.map((block: ContentBlock) => (block.type === 'text' ? (block.text ?? '') : '')).join('\n');
}
