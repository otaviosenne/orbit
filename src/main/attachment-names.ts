// A file's own name, kept readable for Claude but safe as one word in a message: no spaces (a pasted path must stay
// one token), no "_" or "*" (markdown would eat them), no path parts, no hidden files.
const UNSAFE_RUN: RegExp = /[^A-Za-z0-9.-]+/g;
const DASH_RUN: RegExp = /-{2,}/g;
const EDGE_DOTS_AND_DASHES: RegExp = /^[.-]+|[.-]+$/g;
const COMBINING_MARKS: RegExp = /[̀-ͯ]/g;
const EXTENSION_UNSAFE: RegExp = /[^a-z0-9]/g;
const PATH_SEPARATORS: RegExp = /[\\/]/;
const MAX_STEM_LENGTH: number = 80;
const MAX_EXTENSION_LENGTH: number = 10;
const FALLBACK_STEM: string = 'file';

interface NameParts {
  readonly stem: string;
  readonly extension: string;
}

export function sanitizedFileName(name: string): string {
  return joinParts(sanitizedParts(name));
}

// The same name with a tag before its extension, for when the plain name is already taken.
export function taggedFileName(sanitized: string, tag: string): string {
  const parts: NameParts = splitName(sanitized);
  return joinParts({ stem: `${parts.stem}-${tag}`, extension: parts.extension });
}

function sanitizedParts(name: string): NameParts {
  const base: string = name.split(PATH_SEPARATORS).pop() ?? '';
  const ascii: string = base.normalize('NFKD').replace(COMBINING_MARKS, '');
  const parts: NameParts = splitName(ascii);
  const stem: string = parts.stem.replace(UNSAFE_RUN, '-').replace(DASH_RUN, '-').replace(EDGE_DOTS_AND_DASHES, '').slice(0, MAX_STEM_LENGTH);
  const extension: string = parts.extension.toLowerCase().replace(EXTENSION_UNSAFE, '').slice(0, MAX_EXTENSION_LENGTH);
  return { stem: stem.replace(EDGE_DOTS_AND_DASHES, '') || FALLBACK_STEM, extension };
}

// A leading dot starts a hidden file's name, not an extension.
function splitName(name: string): NameParts {
  const dot: number = name.lastIndexOf('.');
  return dot <= 0 ? { stem: name, extension: '' } : { stem: name.slice(0, dot), extension: name.slice(dot + 1) };
}

function joinParts(parts: NameParts): string {
  return parts.extension.length === 0 ? parts.stem : `${parts.stem}.${parts.extension}`;
}
