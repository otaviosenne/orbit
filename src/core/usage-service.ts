import type { LoginState, UsageLimit, UsageSample, UsageSnapshot } from '../shared/types';
import { WEEKLY_ALL_LABEL } from '../shared/usage-labels';
import { readLoginState } from './login-status';
import { nextUsageDelay } from './usage-backoff';
import { loadCachedUsage, saveCachedUsage } from './usage-cache';
import { UsageRateLimited, fetchRawUsage } from './usage-client';
import { recentSamples, withSample } from './usage-history-log';
import { loadUsageHistory, saveUsageHistory } from './usage-history-store';
import { toUsageSnapshot } from './usage-mapper';

const EMPTY_USAGE: UsageSnapshot = { limits: [], breakdown: [], weeklyHistory: [], login: 'signed-in', fetchedAt: null, error: null };

// The numbers move slowly and the endpoint is shared with Claude Code; it is asked at most once a minute, less
// after failures, and the last good reading (also from before a restart) stays on screen meanwhile.
export class UsageService {
  private snapshot: UsageSnapshot = EMPTY_USAGE;
  private nextAttemptAt: number = 0;
  private failures: number = 0;
  private history: UsageSample[] = [];
  private inFlight: Promise<UsageSnapshot> | null = null;
  private readonly restored: Promise<void> = this.restore();

  async current(): Promise<UsageSnapshot> {
    await this.restored;
    const login: LoginState = await readLoginState(Date.now());
    if (Date.now() < this.nextAttemptAt) return { ...this.snapshot, login };
    this.inFlight ??= this.refresh().finally((): void => {
      this.inFlight = null;
    });
    return { ...(await this.inFlight), login };
  }

  private async restore(): Promise<void> {
    const cached: UsageSnapshot | null = await loadCachedUsage();
    this.history = await loadUsageHistory();
    if (cached !== null) this.snapshot = { ...cached, weeklyHistory: recentSamples(this.history, Date.now()) };
  }

  private async refresh(): Promise<UsageSnapshot> {
    try {
      const fresh: UsageSnapshot = toUsageSnapshot(await fetchRawUsage(), Date.now());
      this.snapshot = { ...fresh, weeklyHistory: this.record(fresh) };
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

  private record(snapshot: UsageSnapshot): UsageSample[] {
    const weekly: UsageLimit | undefined = snapshot.limits.find((limit: UsageLimit) => limit.label === WEEKLY_ALL_LABEL);
    if (weekly === undefined || snapshot.fetchedAt === null) return recentSamples(this.history, Date.now());
    this.history = withSample(this.history, { at: snapshot.fetchedAt, percent: weekly.percent });
    void saveUsageHistory(this.history);
    return recentSamples(this.history, Date.now());
  }
}
