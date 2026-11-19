// The form field and JSON key a Shortcut puts the text under.
export const PHONE_TEXT_FIELD: string = 'text';

const JSON_TYPE: string = 'application/json';
const FORM_TYPE: string = 'application/x-www-form-urlencoded';
const TEXT_TYPE_PREFIX: string = 'text/';

export type PhoneText = { readonly kind: 'text'; readonly text: string } | { readonly kind: 'unsupported' } | { readonly kind: 'malformed' };

// iOS Shortcuts can send the clipboard as a JSON body, a form or a raw file; each is read by its Content-Type. A body
// without one is taken as plain text, since that is what a bare "File" body of text amounts to.
export function parsePhoneText(contentType: string | undefined, body: string): PhoneText {
  const type: string = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (type === JSON_TYPE) return fromJson(body);
  if (type === FORM_TYPE) return fromForm(body);
  if (type === '' || type.startsWith(TEXT_TYPE_PREFIX)) return { kind: 'text', text: body };
  return { kind: 'unsupported' };
}

function fromJson(body: string): PhoneText {
  try {
    const parsed: unknown = JSON.parse(body);
    const text: unknown = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>)[PHONE_TEXT_FIELD] : undefined;
    return typeof text === 'string' ? { kind: 'text', text } : { kind: 'malformed' };
  } catch {
    return { kind: 'malformed' };
  }
}

function fromForm(body: string): PhoneText {
  const text: string | null = new URLSearchParams(body).get(PHONE_TEXT_FIELD);
  return text === null ? { kind: 'malformed' } : { kind: 'text', text };
}
