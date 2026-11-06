// How far a shutdown or restart started from Orbit Web has gone, read from what the address answers over time.
// 'starting': the tunnel answers but Orbit does not; 'off': not even the tunnel; 'unknown': the phone is offline.
export type OriginState = 'online' | 'starting' | 'off' | 'unknown';
export type PowerMode = 'shutdown' | 'restart';

// Measured on this PC: the tunnel goes down about a second after poweroff and the machine is off some 15 s later;
// back from a restart, the tunnel answers about 55 s after going down and Orbit a few seconds after it.
const CLOSING_EXPECTED_MS: number = 4_000;
const POWER_OFF_MS: number = 15_000;
const RESTART_TUNNEL_EXPECTED_MS: number = 55_000;
const RESTART_ORBIT_EXPECTED_MS: number = 12_000;
// Where each phase ends on the bar; only a finished run reaches 100.
const CLOSING_SHARE: number = 30;
const RESTART_CLOSING_SHARE: number = 15;
const RESTART_DARK_SHARE: number = 80;
const RESTART_ORBIT_CAP: number = 98;
const FULL: number = 100;
// A PC still answering after this did not shut down (an inhibitor, or the command failed on the way).
const GIVE_UP_MS: number = 90_000;
const RESTART_GIVE_UP_MS: number = 4 * 60_000;

export type PowerPhase = 'closing' | 'powering-off' | 'off' | 'booting' | 'opening' | 'back' | 'stuck';

export class PowerProgress {
  private downAt: number | null = null;
  private darkSeen: boolean = false;
  private startingAt: number | null = null;
  private onlineAt: number | null = null;
  private shown: number = 0;

  constructor(readonly mode: PowerMode, private readonly startedAt: number) {}

  // A shutdown counts as down once Orbit stops answering; a restart is back only after the tunnel went dark.
  observe(state: OriginState, now: number): void {
    if (state === 'unknown') return;
    if (state !== 'online' && this.downAt === null) this.downAt = now;
    if (state === 'off') this.darkSeen = true;
    if (state === 'starting' && this.darkSeen && this.startingAt === null) this.startingAt = now;
    if (state === 'online' && this.darkSeen && this.onlineAt === null) this.onlineAt = now;
  }

  // Never goes back, so a late observation only ever speeds the bar up.
  percent(now: number): number {
    this.shown = Math.min(FULL, Math.max(this.shown, this.mode === 'shutdown' ? this.shutdownPercent(now) : this.restartPercent(now)));
    return Math.floor(this.shown);
  }

  phase(now: number): PowerPhase {
    if (this.isStuck(now)) return 'stuck';
    if (this.mode === 'shutdown') {
      if (this.downAt === null) return 'closing';
      return now - this.downAt < POWER_OFF_MS ? 'powering-off' : 'off';
    }
    if (this.onlineAt !== null) return 'back';
    if (this.startingAt !== null) return 'opening';
    return this.downAt === null ? 'closing' : 'booting';
  }

  isStuck(now: number): boolean {
    const limit: number = this.mode === 'shutdown' ? GIVE_UP_MS : RESTART_GIVE_UP_MS;
    return now - this.startedAt > limit && (this.mode === 'shutdown' ? this.downAt === null : this.onlineAt === null);
  }

  private shutdownPercent(now: number): number {
    if (this.downAt === null) return CLOSING_SHARE * eased(now - this.startedAt, CLOSING_EXPECTED_MS);
    return CLOSING_SHARE + (FULL - CLOSING_SHARE) * Math.min(1, (now - this.downAt) / POWER_OFF_MS);
  }

  private restartPercent(now: number): number {
    if (this.onlineAt !== null) return FULL;
    if (this.startingAt !== null) return RESTART_DARK_SHARE + (RESTART_ORBIT_CAP - RESTART_DARK_SHARE) * eased(now - this.startingAt, RESTART_ORBIT_EXPECTED_MS);
    if (this.downAt === null) return RESTART_CLOSING_SHARE * eased(now - this.startedAt, CLOSING_EXPECTED_MS);
    return RESTART_CLOSING_SHARE + (RESTART_DARK_SHARE - RESTART_CLOSING_SHARE) * eased(now - this.downAt, RESTART_TUNNEL_EXPECTED_MS);
  }
}

// Quick at first and slower near the phase's end, so a slow step never looks frozen nor finished early.
function eased(elapsed: number, expected: number): number {
  return 1 - Math.exp((-2 * Math.max(0, elapsed)) / expected);
}
