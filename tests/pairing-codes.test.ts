import { describe, expect, it } from 'vitest';
import { PAIRING_CODE_TTL_MS, PairingCodes } from '../src/main/remote/pairing-codes';

describe('pairing codes', () => {
  it('work once, typed however, until they expire', () => {
    const codes: PairingCodes = new PairingCodes();
    const first: string = codes.issue(0).code;
    expect(codes.redeem(` ${first.toLowerCase().replace('-', '')} `, 1)).toBe(true);
    expect(codes.redeem(first, 2)).toBe(false);
    const second: string = codes.issue(0).code;
    expect(codes.redeem(second, PAIRING_CODE_TTL_MS)).toBe(false);
  });

  it('never take an access token or a made-up code', () => {
    const codes: PairingCodes = new PairingCodes();
    codes.issue(0);
    expect(codes.redeem('ABCD-EFGH', 1)).toBe(false);
    expect(codes.redeem('x'.repeat(43), 1)).toBe(false);
  });
});
