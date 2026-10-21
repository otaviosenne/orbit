// One "update tab navigation" command: a base::Pickle holding the tab id, the entry's index in the tab's
// history, its URL (UTF-8) and its title (UTF-16), each field aligned to 4 bytes.
export interface SnssNavigation {
  readonly tabId: number;
  readonly index: number;
  readonly url: string;
  readonly title: string;
}

const FIELD_ALIGNMENT: number = 4;
const INT_BYTES: number = 4;
const UTF16_UNIT_BYTES: number = 2;
// The pickle starts with its own payload size, which the command size already gives.
const PICKLE_HEADER_BYTES: number = 4;

const utf8: TextDecoder = new TextDecoder('utf-8');
const utf16: TextDecoder = new TextDecoder('utf-16le');

// Null when the payload is shorter than its fields claim, as a damaged or foreign command would be.
export function readSnssNavigation(payload: DataView): SnssNavigation | null {
  const reader: PickleReader = new PickleReader(payload, PICKLE_HEADER_BYTES);
  const tabId: number | null = reader.int();
  const index: number | null = reader.int();
  const url: string | null = reader.string(1, utf8);
  const title: string | null = reader.string(UTF16_UNIT_BYTES, utf16);
  if (tabId === null || index === null || url === null || title === null) return null;
  return { tabId, index, url, title };
}

class PickleReader {
  constructor(
    private readonly view: DataView,
    private offset: number,
  ) {}

  int(): number | null {
    if (this.offset + INT_BYTES > this.view.byteLength) return null;
    const value: number = this.view.getInt32(this.offset, true);
    this.offset += INT_BYTES;
    return value;
  }

  // Strings are a length in code units followed by the units, padded to the field alignment.
  string(unitBytes: number, decoder: TextDecoder): string | null {
    const length: number | null = this.int();
    if (length === null || length < 0) return null;
    const bytes: number = length * unitBytes;
    if (this.offset + bytes > this.view.byteLength) return null;
    const text: string = decoder.decode(new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, bytes));
    this.offset += Math.ceil(bytes / FIELD_ALIGNMENT) * FIELD_ALIGNMENT;
    return text;
  }
}
