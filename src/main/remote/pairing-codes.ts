import { randomInt } from 'node:crypto';

// A signed-in device lets another one in without showing the access token: it asks for a short code, and the new
// device signs in with that code once. Short enough to type, too short to guess before it expires, given the sign-in
// rate limit (32^8 codes, a handful of tries a minute).
const CODE_ALPHABET: string = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH: number = 8;
const GROUP_LENGTH: number = 4;
export const PAIRING_CODE_TTL_MS: number = 5 * 60_000;
// A few at once: one per device being set up; older ones go first.
const MAX_LIVE_CODES: number = 5;
// What people type between the groups, or by mistake around them.
const NOT_CODE: RegExp = /[^A-Z0-9]/g;

export interface PairingCode {
  // "ABCD-EFGH", as shown; any spacing or case is accepted back.
  readonly code: string;
  readonly expiresAt: number;
}

export class PairingCodes {
  private readonly live: Map<string, number> = new Map();

  issue(now: number): PairingCode {
    this.forgetExpired(now);
    while (this.live.size >= MAX_LIVE_CODES) this.live.delete(this.live.keys().next().value as string);
    const code: string = Array.from({ length: CODE_LENGTH }, (): string => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)] ?? '').join('');
    const expiresAt: number = now + PAIRING_CODE_TTL_MS;
    this.live.set(code, expiresAt);
    return { code: `${code.slice(0, GROUP_LENGTH)}-${code.slice(GROUP_LENGTH)}`, expiresAt };
  }

  // Used once: a code that worked is gone, so a leaked link is worthless after the device it was meant for used it.
  redeem(given: string, now: number): boolean {
    this.forgetExpired(now);
    const code: string = given.toUpperCase().replace(NOT_CODE, '');
    if (code.length !== CODE_LENGTH || !this.live.has(code)) return false;
    this.live.delete(code);
    return true;
  }

  private forgetExpired(now: number): void {
    for (const [code, expiresAt] of [...this.live]) if (expiresAt <= now) this.live.delete(code);
  }
}
