import { basename, dirname, isAbsolute, normalize } from 'node:path';

const NUL: string = '\0';
const PARENT_NAMES: ReadonlySet<string> = new Set(['', '.', '..']);

// The path, when it names a file directly inside dir (no sub-folder, no "..", nothing to normalize away); else null.
// Only the spelling is judged here: the caller still checks what is on disk (a link could point anywhere).
export function fileDirectlyIn(dir: string, path: string): string | null {
  if (path.includes(NUL) || !isAbsolute(path) || normalize(path) !== path) return null;
  if (dirname(path) !== dir || PARENT_NAMES.has(basename(path))) return null;
  return path;
}

// An absolute, plain path to show in the file manager; null for anything else.
export function plainAbsolutePath(path: unknown): string | null {
  if (typeof path !== 'string' || path.includes(NUL) || !isAbsolute(path)) return null;
  return normalize(path) === path ? path : null;
}
