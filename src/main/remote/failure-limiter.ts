export interface LimiterPolicy {
  readonly maxFailures: number;
  readonly windowMs: number;
  readonly lockoutMs: number;
}

const MINUTE_MS: number = 60_000;

// Behind a tunnel every request comes from 127.0.0.1, so failures are counted for the whole server, not per address.
export const SIGN_IN_POLICY: LimiterPolicy = { maxFailures: 10, windowMs: 10 * MINUTE_MS, lockoutMs: 15 * MINUTE_MS };

// Counts failed sign-ins in a sliding window; too many lock sign-in for a while, right token or not.
export class FailureLimiter {
  private failures: number[] = [];
  private lockedUntil: number = 0;

  constructor(private readonly policy: LimiterPolicy) {}

  isLocked(now: number): boolean {
    return now < this.lockedUntil;
  }

  retryAfterMs(now: number): number {
    return Math.max(0, this.lockedUntil - now);
  }

  recordFailure(now: number): void {
    this.failures = this.failures.filter((at: number) => now - at < this.policy.windowMs);
    this.failures.push(now);
    if (this.failures.length < this.policy.maxFailures) return;
    this.lockedUntil = now + this.policy.lockoutMs;
    this.failures = [];
  }
}
