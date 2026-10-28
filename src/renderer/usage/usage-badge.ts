import type { UsageLimit, UsageSnapshot } from '../../shared/types';
import { SESSION_LABEL, WEEKLY_ALL_LABEL } from '../../shared/usage-labels';
import { element } from '../dom';
import { buildPaceModel } from './pace-model';
import { paceScore, weeklyLevel } from './weekly-level';

const FULL_PERCENT: number = 100;
const SESSION_WINDOW_MS: number = 5 * 60 * 60 * 1000;
const WEEKLY_NAME: string = 'Weekly limit';
const SESSION_NAME: string = '5-hour window';

// Whichever of the week's all-models usage and the 5-hour session is further over its even pace, beside Resume, as a
// bare percentage colored by how it compares with an even pace over its own window (green far below, neutral near it, then yellow,
// red and purple); clicking it opens the full Usage page in Settings.
export class UsageBadge {
  readonly root: HTMLButtonElement = element('button', 'usage-badge');

  constructor(openUsage: () => void) {
    this.root.type = 'button';
    this.root.hidden = true;
    this.root.addEventListener('click', openUsage);
  }

  show(usage: UsageSnapshot | null): void {
    const now: number = Date.now();
    const shown: UsageLimit | null = worseLimit(usage, now);
    this.root.hidden = shown === null;
    if (shown === null) return;
    const percent: number = Math.round(shown.percent);
    this.root.textContent = `${percent}%`;
    const expected: number | null = evenPaceNow(shown, now);
    this.root.dataset['level'] = expected === null ? 'ok' : weeklyLevel(shown.percent, expected);
    const pace: string = expected === null ? '' : `, an even pace is ${Math.round(expected)}%`;
    this.root.title = badgeTooltip(shown, percent, pace);
  }
}

// Which window the number belongs to comes first, since the bare percentage does not say.
export function badgeTooltip(limit: UsageLimit, percent: number, pace: string): string {
  const name: string = limit.label === SESSION_LABEL ? SESSION_NAME : WEEKLY_NAME;
  return `${name}\n${percent}% used${pace}\nThe one of the two further over its pace. Click for details`;
}

// The limit that is worse off against its own even pace, not the one with the higher number: 60% of the week by
// Wednesday morning is a bigger problem than 70% of a session that resets within the hour. The weekly limit wins a tie,
// since it is the one that cannot be waited out in hours.
export function worseLimit(usage: UsageSnapshot | null, now: number): UsageLimit | null {
  const weekly: UsageLimit | undefined = usage?.limits.find((limit: UsageLimit) => limit.label === WEEKLY_ALL_LABEL);
  const session: UsageLimit | undefined = usage?.limits.find((limit: UsageLimit) => limit.label === SESSION_LABEL);
  if (weekly === undefined) return session ?? null;
  if (session === undefined) return weekly;
  const weeklyScore: number | null = scoreNow(weekly, now);
  const sessionScore: number | null = scoreNow(session, now);
  // Without a pace for both there is nothing to weigh them by, so the higher number stands in.
  if (weeklyScore === null || sessionScore === null) return session.percent > weekly.percent ? session : weekly;
  return sessionScore > weeklyScore ? session : weekly;
}

function scoreNow(limit: UsageLimit, now: number): number | null {
  const expected: number | null = evenPaceNow(limit, now);
  return expected === null ? null : paceScore(limit.percent, expected);
}

// Without a reset time there is no window to pace, so the number stays neutral.
function evenPaceNow(limit: UsageLimit, now: number): number | null {
  if (limit.resetsAt === null) return null;
  if (limit.label === SESSION_LABEL) return elapsedPercent(limit.resetsAt, now);
  return buildPaceModel(limit.resetsAt, [], now).expectedNow;
}

// The session is not limited to working hours, so its even pace is simply the share of the 5 hours that has passed.
export function elapsedPercent(resetsAt: number, now: number): number {
  const elapsed: number = SESSION_WINDOW_MS - (resetsAt - now);
  return Math.min(FULL_PERCENT, Math.max(0, (elapsed / SESSION_WINDOW_MS) * FULL_PERCENT));
}
