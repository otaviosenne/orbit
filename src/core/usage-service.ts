import type { UsageSnapshot } from '../shared/types';
import { nextUsageDelay } from './usage-backoff';
import { loadCachedUsage, saveCachedUsage } from './usage-cache';
import { UsageRateLimited, fetchRawUsage } from './usage-client';
import { toUsageSnapshot } from './usage-mapper';

const EMPTY_USAGE: UsageSnapshot = { limits: [], breakdown: [], fetchedAt: null, error: null };

// The numbers move slowly and the endpoint is shared with Claude Code; it is asked at most once a minute, less
// after failures, and the last good reading (also from before a restart) stays on screen meanwhile.
export class UsageService {
  private snapshot: UsageSnapshot = EMPTY_USAGE;
  private nextAttemptAt: number = 0;
  private failures: number = 0;
  private inFlight: Promise<UsageSnapshot> | null = null;
  private readonly restored: Promise<void> = this.restore();

  async current(): Promise<UsageSnapshot> {
    await this.restored;
    if (Date.now() < this.nextAttemptAt) return this.snapshot;
    this.inFlight ??= this.refresh().finally((): void => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async restore(): Promise<void> {
    const cached: UsageSnapshot | null = await loadCachedUsage();
    if (cached !== null) this.snapshot = cached;
  }

  private async refresh(): Promise<UsageSnapshot> {
    try {
      this.snapshot = toUsageSnapshot(await fetchRawUsage(), Date.now());
      this.failures = 0;
      this.nextAttemptAt = Date.now() + nextUsageDelay(0, null);
      void saveCachedUsage(this.snapshot);
    } catch (error: unknown) {
      const retryAfter: number | null = error instanceof UsageRateLimited ? error.retryAfterMs : null;
      this.nextAttemptAt = Date.now() + nextUsageDelay(this.failures, retryAfter);
      this.failures += 1;
      this.snapshot = { ...this.snapshot, error: error instanceof Error ? error.message : String(error) };
    }
    return this.snapshot;
  }
}
