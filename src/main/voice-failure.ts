// Plain words for why the speech service said no, so a billing or login problem is named instead of shown as a code.
const BILLING_STATUSES: ReadonlySet<number> = new Set([402]);
const LOGIN_STATUSES: ReadonlySet<number> = new Set([401]);
const RATE_LIMIT_STATUS: number = 429;
const BILLING_WORDS: RegExp = /billing|payment|credit|subscription|quota|insufficient|overdue|past[_ ]due/i;
const HTTP_PATTERN: RegExp = /HTTP (\d{3})|server response: (\d{3})/i;

export function explainVoiceFailure(raw: string): string {
  const status: number | null = statusOf(raw);
  if (status !== null && BILLING_STATUSES.has(status)) return 'Billing problem on your Claude account: fix the payment and dictation will work again.';
  if (BILLING_WORDS.test(raw)) return `Billing or plan problem on your Claude account (${raw}). Fix it and dictation will work again.`;
  if (status !== null && LOGIN_STATUSES.has(status)) return 'Your Claude login expired: open Claude Code once to refresh it.';
  if (status === RATE_LIMIT_STATUS) return 'Too many voice requests right now: wait a moment and try again.';
  return raw;
}

function statusOf(raw: string): number | null {
  const match: RegExpExecArray | null = HTTP_PATTERN.exec(raw);
  const digits: string | undefined = match?.[1] ?? match?.[2];
  return digits === undefined ? null : Number(digits);
}
