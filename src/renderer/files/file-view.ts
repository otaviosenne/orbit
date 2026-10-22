import type { AttachmentKind } from '../../shared/attachment-kinds';

// What the viewer is asked to show: a file sent with a message (by its path), or the local copy of one still being sent.
export interface FileView {
  readonly kind: AttachmentKind;
  readonly name: string;
  // Where Claude reads it; null while the message is still being sent.
  readonly path: string | null;
  // Inside Orbit's attachments folder, so the main process may hand its bytes to the viewer.
  readonly isAttachment: boolean;
  // The composer's own copy, for a message not confirmed yet.
  readonly localUrl: string | null;
}

export type PlayableKind = 'video' | 'audio' | 'pdf';

export function playableKind(kind: AttachmentKind): PlayableKind | null {
  return kind === 'video' || kind === 'audio' || kind === 'pdf' ? kind : null;
}
