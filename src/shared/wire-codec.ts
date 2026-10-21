// JSON has no bytes, so a Uint8Array (an attached image) crosses HTTP as base64 under this one key.
const BYTES_KEY: string = '$bytes';
// String.fromCharCode takes its codes as arguments; chunks keep a large image under the engine's argument limit.
const CHUNK_SIZE: number = 0x8000;

export function encodeWire(value: unknown): string {
  return JSON.stringify(value, (_key: string, item: unknown): unknown => (item instanceof Uint8Array ? { [BYTES_KEY]: toBase64(item) } : item));
}

export function decodeWire(text: string): unknown {
  return JSON.parse(text, (_key: string, item: unknown): unknown => (isEncodedBytes(item) ? fromBase64(item[BYTES_KEY]) : item));
}

function isEncodedBytes(item: unknown): item is Record<typeof BYTES_KEY, string> {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  const keys: string[] = Object.keys(item);
  return keys.length === 1 && keys[0] === BYTES_KEY && typeof (item as Record<string, unknown>)[BYTES_KEY] === 'string';
}

export function toBase64(bytes: Uint8Array): string {
  let binary: string = '';
  for (let start: number = 0; start < bytes.length; start += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK_SIZE));
  }
  return btoa(binary);
}

// Throws on text that is not base64, which the server turns into a 400.
export function fromBase64(text: string): Uint8Array {
  const binary: string = atob(text);
  const bytes: Uint8Array = new Uint8Array(binary.length);
  for (let index: number = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
