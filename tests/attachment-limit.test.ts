import { describe, expect, it } from 'vitest';
import { withinLimit } from '../src/renderer/sheet/attachment-limit';

const MEGABYTE: number = 1024 * 1024;
const file = (name: string, megabytes: number): File => new File([new Uint8Array(megabytes * MEGABYTE)], name);

describe('withinLimit', () => {
  it('takes files in order while they fit and names the ones that do not', () => {
    const limited = withinLimit([file('a.pdf', 2), file('big.mov', 9), file('b.txt', 1)], 1 * MEGABYTE, 5 * MEGABYTE);
    expect(limited.accepted.map((accepted: File) => accepted.name)).toEqual(['a.pdf', 'b.txt']);
    expect(limited.problem).toContain('big.mov');
  });

  it('says nothing when everything fits', () => {
    expect(withinLimit([file('a.pdf', 1)], 0, 5 * MEGABYTE).problem).toBeNull();
  });
});
