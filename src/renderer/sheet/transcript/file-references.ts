import type { AttachmentKind } from '../../../shared/attachment-kinds';
import { extensionOf, isMediaExtension, pathKindOf } from '../../../shared/attachment-kinds';

// A file named in a sent message by its absolute path: one Orbit attached (in its attachments folder, any kind), or
// any video, audio or PDF elsewhere. Only an attachment can be opened in the viewer; the rest show their path.
export interface FileReference {
  readonly start: number;
  readonly end: number;
  readonly path: string;
  readonly name: string;
  readonly kind: AttachmentKind;
  readonly isAttachment: boolean;
}

// Orbit saves attachments in ~/.cache/orbit/attachments; the web page does not know the home folder, so the
// folder is told by its tail. The main process checks the full path again before it reads anything.
const ATTACHMENTS_FOLDER: string = '/.cache/orbit/attachments/';
// An absolute path starts a word (or follows an opening bracket or quote) and runs to the next space or quote.
const PATH_CANDIDATE: RegExp = /(^|[\s(<"'[])(\/[^\s"'`<>]+)/g;
// Punctuation closing a sentence or a bracket is not part of the path before it.
const TRAILING_PUNCTUATION: RegExp = /[.,;:!?)\]}>]+$/;

export function findFileReferences(text: string): FileReference[] {
  return [...text.matchAll(PATH_CANDIDATE)].flatMap((match: RegExpExecArray): FileReference[] => {
    const lead: string = match[1] ?? '';
    const path: string = (match[2] ?? '').replace(TRAILING_PUNCTUATION, '');
    const start: number = match.index + lead.length;
    const reference: FileReference | null = referenceAt(path, start);
    return reference === null ? [] : [reference];
  });
}

function referenceAt(path: string, start: number): FileReference | null {
  const isAttachment: boolean = isAttachmentPath(path);
  if (!isAttachment && !isMediaExtension(extensionOf(path))) return null;
  return { start, end: start + path.length, path, name: fileName(path), kind: pathKindOf(path), isAttachment };
}

export function isAttachmentPath(path: string): boolean {
  const folderAt: number = path.lastIndexOf(ATTACHMENTS_FOLDER);
  return folderAt >= 0 && path.length > folderAt + ATTACHMENTS_FOLDER.length && path.indexOf('/', folderAt + ATTACHMENTS_FOLDER.length) === -1;
}

export function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
