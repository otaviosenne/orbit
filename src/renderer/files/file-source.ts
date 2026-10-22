import type { AttachmentBlob } from '../../shared/types';
import type { FileView } from './file-view';

// Where the viewer reads a file from, and whether the viewer made that URL (and so must let go of it).
export interface FileSource {
  readonly url: string;
  readonly isOwned: boolean;
}

// The local copy while the message is being sent; afterwards the bytes come from the main process, which serves
// only files in Orbit's attachments folder.
export async function loadFileSource(view: FileView): Promise<FileSource | null> {
  if (view.localUrl !== null) return { url: view.localUrl, isOwned: false };
  if (view.path === null || !view.isAttachment) return null;
  const blob: AttachmentBlob | null = await window.radar.getAttachment(view.path).catch((): null => null);
  return blob === null ? null : { url: URL.createObjectURL(new Blob([new Uint8Array(blob.bytes)], { type: blob.mediaType })), isOwned: true };
}
