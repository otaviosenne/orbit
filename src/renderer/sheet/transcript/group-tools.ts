import type { ToolItem, TranscriptItem } from '../../../shared/types';

// Back-to-back tool calls collapse into one block so the conversation stays readable.
export interface ToolGroup {
  readonly kind: 'tools';
  readonly id: string;
  readonly tools: readonly ToolItem[];
}

export type TranscriptEntry = Exclude<TranscriptItem, ToolItem> | ToolGroup;

export function groupTools(items: readonly TranscriptItem[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  for (const item of items) {
    const last: TranscriptEntry | undefined = entries.at(-1);
    if (item.kind !== 'tool') entries.push(item);
    else if (last?.kind === 'tools') entries[entries.length - 1] = { ...last, tools: [...last.tools, item] };
    else entries.push({ kind: 'tools', id: item.id, tools: [item] });
  }
  return entries;
}
