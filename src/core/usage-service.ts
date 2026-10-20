import type { UsageSnapshot } from '../shared/types';
import { fetchRawUsage } from './usage-client';
import { toUsageSnapshot } from './usage-mapper';

// The numbers move slowly and the endpoint is shared with Claude Code; once a minute is plenty.
const USAGE_REFRESH_MS: number = 60_000;

const EMPTY_USAGE: UsageSnapshot = { limits: [], breakdown: [], fetchedAt: null, error: null };

export class UsageService {
  private snapshot: UsageSnapshot = EMPTY_USAGE;
  private lastAttemptAt: number = 0;
  private inFlight: Promise<UsageSnapshot> | null = null;

  current(): Promise<UsageSnapshot> {
    if (Date.now() - this.lastAttemptAt < USAGE_REFRESH_MS) return Promise.resolve(this.snapshot);
    this.inFlight ??= this.refresh().finally((): void => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<UsageSnapshot> {
    this.lastAttemptAt = Date.now();
    try {
      this.snapshot = toUsageSnapshot(await fetchRawUsage(), Date.now());
    } catch (error: unknown) {
      this.snapshot = { ...this.snapshot, error: error instanceof Error ? error.message : String(error) };
    }
    return this.snapshot;
  }
}
