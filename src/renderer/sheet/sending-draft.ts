import type { AttachmentUpload } from '../../shared/types';
import type { AttachmentTray } from './attachment-tray';
import type { OrderedDraft } from './draft-image-tokens';
import { orderByTokens } from './draft-image-tokens';

// A draft about to be sent: markers renumbered in reading order, the attachments in that same order (as bytes to
// send, and as files to put back if delivery fails). An attachment whose marker was deleted is left out.
export interface SendingDraft {
  readonly text: string;
  readonly uploads: AttachmentUpload[];
  readonly files: File[];
}

export async function sendingDraft(text: string, tray: AttachmentTray): Promise<SendingDraft> {
  const draft: OrderedDraft = orderByTokens(text, tray.count);
  return { text: draft.text, uploads: inOrder(await tray.uploads(), draft.order), files: inOrder(tray.files(), draft.order) };
}

function inOrder<T>(items: readonly T[], order: readonly number[]): T[] {
  return order.flatMap((index: number): T[] => {
    const item: T | undefined = items[index];
    return item === undefined ? [] : [item];
  });
}
