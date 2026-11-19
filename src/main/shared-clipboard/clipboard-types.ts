import { SECRET_MIME_TYPE } from '../secret-clipboard/clipboard-commands';

export type ClipboardContent = { readonly kind: 'secret' } | { readonly kind: 'empty' } | { readonly kind: 'not-text' } | { readonly kind: 'text'; readonly type: string };

// Asked for in this order, so the phone gets UTF-8 plain text whenever the copying app offers it.
const PREFERRED_TEXT_TYPES: readonly string[] = ['text/plain;charset=utf-8', 'text/plain', 'UTF8_STRING', 'STRING', 'TEXT'];
const TEXT_TYPE_PREFIX: string = 'text/';

// Decides from the offered MIME types alone, before any content is read. The marker wins over everything: a
// request_typing secret may be offered as text too, and must never reach the phone.
export function classifyClipboard(types: readonly string[]): ClipboardContent {
  if (types.includes(SECRET_MIME_TYPE)) return { kind: 'secret' };
  if (types.length === 0) return { kind: 'empty' };
  const type: string | undefined = PREFERRED_TEXT_TYPES.find((preferred: string) => types.includes(preferred)) ?? types.find((offered: string) => offered.startsWith(TEXT_TYPE_PREFIX));
  return type === undefined ? { kind: 'not-text' } : { kind: 'text', type };
}

export function parseTypeList(output: string): string[] {
  return output
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
}
