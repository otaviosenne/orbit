import type { MessageItem, TranscriptItem } from '../../shared/types';

// The newest message in the chat, from either side; tools, notices and turns are not messages.
export function lastMessage(items: readonly TranscriptItem[]): MessageItem | null {
  for (let index: number = items.length - 1; index >= 0; index--) {
    const item: TranscriptItem | undefined = items[index];
    if (item?.kind === 'message' && item.text.trim().length > 0) return item;
  }
  return null;
}
