const WEB_PROTOCOLS: readonly string[] = ['https:', 'http:'];

// Only the origin is kept: Orbit Web is served from the root of its address, and the origin is what browsers send.
// Returns '' for an empty field and null for something that is not a web address.
export function normalizeExternalUrl(input: string): string | null {
  const trimmed: string = input.trim();
  if (trimmed.length === 0) return '';
  try {
    const url: URL = new URL(trimmed);
    return WEB_PROTOCOLS.includes(url.protocol) && url.username === '' && url.password === '' ? url.origin : null;
  } catch {
    return null;
  }
}
