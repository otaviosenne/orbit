import { SECRET_MIME_TYPE } from '../secret-clipboard/clipboard-commands';
import { PNG_MIME_TYPE } from './image-format';

export type ClipboardContent =
  | { readonly kind: 'secret' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'text'; readonly type: string }
  | { readonly kind: 'image'; readonly type: string };

// Asked for in this order, so the phone gets UTF-8 plain text whenever the copying app offers it.
const PREFERRED_TEXT_TYPES: readonly string[] = ['text/plain;charset=utf-8', 'text/plain', 'UTF8_STRING', 'STRING', 'TEXT'];
const TEXT_TYPE_PREFIX: string = 'text/';
const IMAGE_TYPE_PREFIX: string = 'image/';

// Decides from the offered MIME types alone, before any content is read. The marker wins over everything: a
// request_typing secret may be offered as text too, and must never reach the phone. Plain text beats an image, but an
// image beats the HTML a browser offers beside a copied picture.
export function classifyClipboard(types: readonly string[]): ClipboardContent {
  if (types.includes(SECRET_MIME_TYPE)) return { kind: 'secret' };
  if (types.length === 0) return { kind: 'empty' };
  const plain: string | undefined = PREFERRED_TEXT_TYPES.find((preferred: string) => types.includes(preferred));
  if (plain !== undefined) return { kind: 'text', type: plain };
  const image: string | undefined = types.includes(PNG_MIME_TYPE) ? PNG_MIME_TYPE : types.find((offered: string) => offered.startsWith(IMAGE_TYPE_PREFIX));
  if (image !== undefined) return { kind: 'image', type: image };
  const text: string | undefined = types.find((offered: string) => offered.startsWith(TEXT_TYPE_PREFIX));
  return text === undefined ? { kind: 'unsupported' } : { kind: 'text', type: text };
}

export function parseTypeList(output: string): string[] {
  return output
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
}
