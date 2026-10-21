import { readAccessToken } from './claude-login';

const USAGE_URL: string = 'https://api.anthropic.com/api/oauth/usage';
const OAUTH_BETA_HEADER: string = 'oauth-2025-04-20';
const UNAUTHORIZED_STATUS: number = 401;
const TOO_MANY_REQUESTS_STATUS: number = 429;
const MS_PER_SECOND: number = 1000;

// The endpoint asked to be left alone; retryAfterMs is how long, when it said.
export class UsageRateLimited extends Error {
  constructor(readonly retryAfterMs: number | null) {
    super(`Usage request failed (${TOO_MANY_REQUESTS_STATUS})`);
  }
}

export interface RawLimit {
  readonly kind: string;
  readonly percent: number;
  readonly resets_at: string | null;
  readonly scope: { readonly model?: { readonly display_name?: string | null } | null } | null;
}

export interface RawShare {
  readonly display_name: string;
  readonly percent: number;
}

export interface RawUsage {
  readonly limits?: readonly RawLimit[];
  readonly seven_day_breakdown?: { readonly rows?: readonly RawShare[] } | null;
}

export async function fetchRawUsage(): Promise<RawUsage> {
  const response: Response = await fetch(USAGE_URL, {
    headers: { Authorization: `Bearer ${await readAccessToken()}`, 'anthropic-beta': OAUTH_BETA_HEADER },
  });
  if (response.status === UNAUTHORIZED_STATUS) throw new Error('Login expired; it renews on the next Claude request');
  if (response.status === TOO_MANY_REQUESTS_STATUS) throw new UsageRateLimited(retryAfterMs(response.headers.get('retry-after')));
  if (!response.ok) throw new Error(`Usage request failed (${response.status})`);
  return (await response.json()) as RawUsage;
}

// Retry-After in seconds; the HTTP-date form is not used by this endpoint, so it reads as unknown.
function retryAfterMs(header: string | null): number | null {
  const seconds: number = Number(header);
  return header !== null && Number.isFinite(seconds) && seconds > 0 ? seconds * MS_PER_SECOND : null;
}
