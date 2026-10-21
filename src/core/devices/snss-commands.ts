// Chrome's session files ("SNSS") are a header followed by an append-only log of commands, each written as
// a little-endian uint16 size, a one-byte command id and size - 1 bytes of payload.
export interface SnssCommand {
  readonly id: number;
  readonly payload: DataView;
}

const SIGNATURE: string = 'SNSS';
const SIGNATURE_BYTES: number = 4;
const VERSION_BYTES: number = 4;
const HEADER_BYTES: number = SIGNATURE_BYTES + VERSION_BYTES;
const SIZE_BYTES: number = 2;
const ID_BYTES: number = 1;

// Chrome keeps appending while it runs, so a command cut short at the end of the file is dropped, not an error.
export function readSnssCommands(bytes: Uint8Array): SnssCommand[] {
  if (!hasSignature(bytes)) return [];
  const view: DataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const commands: SnssCommand[] = [];
  let offset: number = HEADER_BYTES;
  while (offset + SIZE_BYTES <= bytes.byteLength) {
    const size: number = view.getUint16(offset, true);
    const start: number = offset + SIZE_BYTES;
    if (size < ID_BYTES || start + size > bytes.byteLength) break;
    const payload: DataView = new DataView(bytes.buffer, bytes.byteOffset + start + ID_BYTES, size - ID_BYTES);
    commands.push({ id: view.getUint8(start), payload });
    offset = start + size;
  }
  return commands;
}

function hasSignature(bytes: Uint8Array): boolean {
  if (bytes.byteLength < HEADER_BYTES) return false;
  return String.fromCharCode(...bytes.subarray(0, SIGNATURE_BYTES)) === SIGNATURE;
}
