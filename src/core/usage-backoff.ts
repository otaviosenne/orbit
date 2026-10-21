// After failures the endpoint is asked less and less often, so a rate limit can clear instead of being fed.
const BASE_DELAY_MS: number = 60_000;
const MAX_DELAY_MS: number = 15 * 60_000;
const GROWTH: number = 2;

// How long to wait before the next try: the server's own Retry-After wins, else a doubling delay.
export function nextUsageDelay(failures: number, retryAfterMs: number | null): number {
  if (retryAfterMs !== null) return Math.min(Math.max(retryAfterMs, BASE_DELAY_MS), MAX_DELAY_MS);
  return Math.min(BASE_DELAY_MS * GROWTH ** failures, MAX_DELAY_MS);
}
