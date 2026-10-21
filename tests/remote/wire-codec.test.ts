import { describe, expect, it } from 'vitest';
import { decodeWire, encodeWire } from '../../src/shared/wire-codec';

describe('wire codec', () => {
  it('carries bytes through JSON and back', () => {
    const bytes: Uint8Array = new Uint8Array([0, 1, 254, 255]);
    const decoded: unknown = decodeWire(encodeWire([1, 'text', [{ name: 'a.png', bytes }]]));
    expect(decoded).toEqual([1, 'text', [{ name: 'a.png', bytes }]]);
    expect(((decoded as unknown[])[2] as { bytes: unknown }[])[0]?.bytes).toBeInstanceOf(Uint8Array);
  });

  it('leaves look-alike objects with other keys alone', () => {
    expect(decodeWire('{"$bytes":"AA==","extra":1}')).toEqual({ $bytes: 'AA==', extra: 1 });
  });

  it('handles an image bigger than one chunk', () => {
    const bytes: Uint8Array = new Uint8Array(100_000).map((_value: number, index: number) => index % 256);
    expect(decodeWire(encodeWire(bytes))).toEqual(bytes);
  });
});
