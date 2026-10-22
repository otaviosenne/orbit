// What an attached file is, as far as Orbit and Claude Code care: an image Claude Code takes in as [Image #N], a
// file Orbit can play or show (video, audio, PDF), or any other file, which Claude only gets the path of.
export type AttachmentKind = 'image' | 'video' | 'audio' | 'pdf' | 'file';

// The kinds Orbit can show in its own viewer; the rest only show their path.
export type ViewableKind = Exclude<AttachmentKind, 'image' | 'file'>;

// Claude Code turns a pasted path into an image only for these extensions (its own check, 2.1.308), so only
// these may take the image route; any other picture (svg, bmp, heic) goes as a plain file path.
const PASTED_IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};
const PASTED_IMAGE_TYPES: ReadonlySet<string> = new Set(Object.values(PASTED_IMAGE_EXTENSIONS));

// Formats a browser can usually play or show; the viewer still falls back to the path when one cannot.
const VIEWABLE_EXTENSIONS: Readonly<Record<string, { readonly kind: ViewableKind; readonly mediaType: string }>> = {
  mp4: { kind: 'video', mediaType: 'video/mp4' },
  m4v: { kind: 'video', mediaType: 'video/mp4' },
  webm: { kind: 'video', mediaType: 'video/webm' },
  mov: { kind: 'video', mediaType: 'video/quicktime' },
  mkv: { kind: 'video', mediaType: 'video/x-matroska' },
  ogv: { kind: 'video', mediaType: 'video/ogg' },
  mp3: { kind: 'audio', mediaType: 'audio/mpeg' },
  m4a: { kind: 'audio', mediaType: 'audio/mp4' },
  aac: { kind: 'audio', mediaType: 'audio/aac' },
  wav: { kind: 'audio', mediaType: 'audio/wav' },
  ogg: { kind: 'audio', mediaType: 'audio/ogg' },
  oga: { kind: 'audio', mediaType: 'audio/ogg' },
  opus: { kind: 'audio', mediaType: 'audio/ogg' },
  flac: { kind: 'audio', mediaType: 'audio/flac' },
  pdf: { kind: 'pdf', mediaType: 'application/pdf' },
};

// A file picked or dropped often comes without a type (file.type is ''), so the type only decides when the name has
// no known extension.
const VIEWABLE_TYPE_PREFIXES: readonly (readonly [string, ViewableKind])[] = [
  ['video/', 'video'],
  ['audio/', 'audio'],
  ['application/pdf', 'pdf'],
];

export const KIND_LABELS: Readonly<Record<AttachmentKind, string>> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  file: 'File',
};

const EXTENSION_SEPARATOR: string = '.';

// The lower-case extension of a file name or path, without its dot; '' when it has none.
export function extensionOf(name: string): string {
  const base: string = name.slice(name.lastIndexOf('/') + 1);
  const dot: number = base.lastIndexOf(EXTENSION_SEPARATOR);
  return dot <= 0 ? '' : base.slice(dot + 1).toLowerCase();
}

// The name decides when it has an extension (Claude Code only looks at the path); a nameless paste goes by its type.
export function isPastedImage(name: string, mediaType: string): boolean {
  const extension: string = extensionOf(name);
  return extension.length > 0 ? PASTED_IMAGE_EXTENSIONS[extension] !== undefined : PASTED_IMAGE_TYPES.has(mediaType);
}

// The extension an image is saved under, so the pasted path passes Claude Code's check; null for anything else.
export function pastedImageExtension(name: string, mediaType: string): string | null {
  if (!isPastedImage(name, mediaType)) return null;
  const extension: string = extensionOf(name);
  if (PASTED_IMAGE_EXTENSIONS[extension] !== undefined) return extension;
  return Object.entries(PASTED_IMAGE_EXTENSIONS).find(([, type]: [string, string]) => type === mediaType)?.[0] ?? null;
}

export function attachmentKindOf(name: string, mediaType: string): AttachmentKind {
  if (isPastedImage(name, mediaType)) return 'image';
  return viewableKindOf(name, mediaType) ?? 'file';
}

// The kind a path names by its extension alone, as in a sent message where only the path is left.
export function pathKindOf(path: string): AttachmentKind {
  return attachmentKindOf(path, '');
}

export function viewableKindOf(name: string, mediaType: string): ViewableKind | null {
  const byName: ViewableKind | undefined = VIEWABLE_EXTENSIONS[extensionOf(name)]?.kind;
  if (byName !== undefined) return byName;
  const byType: readonly [string, ViewableKind] | undefined = VIEWABLE_TYPE_PREFIXES.find(([prefix]: readonly [string, ViewableKind]) => mediaType.startsWith(prefix));
  return byType?.[1] ?? null;
}

// The type to serve a viewable file as, from its name; null for anything Orbit does not show.
export function viewableMediaType(name: string): string | null {
  return VIEWABLE_EXTENSIONS[extensionOf(name)]?.mediaType ?? null;
}

// Extensions that make a path in a message worth a chip even outside Orbit's attachments folder.
export function isMediaExtension(extension: string): boolean {
  return VIEWABLE_EXTENSIONS[extension] !== undefined;
}
