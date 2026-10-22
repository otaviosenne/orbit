import { attachmentKindOf } from '../../shared/attachment-kinds';
import type { AttachmentUpload } from '../../shared/types';
import type { PendingAttachment } from './pending-messages';

// The composer lets go of its own copies as soon as it clears, so the sent message needs copies of its own.
export function pendingAttachmentOf(upload: AttachmentUpload): PendingAttachment {
  const url: string = URL.createObjectURL(new Blob([new Uint8Array(upload.bytes)], { type: upload.mediaType }));
  return { kind: attachmentKindOf(upload.name, upload.mediaType), name: upload.name, url };
}
