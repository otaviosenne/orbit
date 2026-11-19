import { MAX_SHARED_TEXT_BYTES } from './clipboard-limits';
import { isImage } from './image-format';
import type { PhoneText } from './phone-text';
import { parsePhoneText } from './phone-text';

export type PhoneContent = PhoneText | { readonly kind: 'image'; readonly bytes: Buffer } | { readonly kind: 'too-large' };

const IMAGE_TYPE_PREFIX: string = 'image/';

// A Shortcut's "File" body carries either the copied picture or the copied text. The bytes tell an image apart, since
// the declared type may be generic; a body that claims to be an image but is none is refused rather than pasted as text.
export function parsePhoneContent(contentType: string | undefined, body: Buffer): PhoneContent {
  if (isImage(body)) return { kind: 'image', bytes: body };
  if ((contentType ?? '').trim().toLowerCase().startsWith(IMAGE_TYPE_PREFIX)) return { kind: 'unsupported' };
  if (body.length > MAX_SHARED_TEXT_BYTES) return { kind: 'too-large' };
  return parsePhoneText(contentType, body.toString('utf8'));
}
