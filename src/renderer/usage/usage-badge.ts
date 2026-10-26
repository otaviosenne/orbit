import type { UsageLimit, UsageSnapshot } from '../../shared/types';
import { SESSION_LABEL, WEEKLY_ALL_LABEL } from '../../shared/usage-labels';
import { element } from '../dom';
import { buildPaceModel } from './pace-model';
import { weeklyLevel } from './weekly-level';

const FULL_PERCENT: number = 100;
const SESSION_WINDOW_MS: number = 5 * 60 * 60 * 1000;

// Whichever of the week's all-models usage and the 5-hour session is higher, beside Resume, as a bare percentage
// colored by how it compares with an even pace over its own window (green far below, neutral near it, then yellow,
// red and purple); clicking it opens the full Usage page in Settings.
export class UsageBadge {
  readonly root: HTMLButtonElement = element('button', 'usage-badge');

  constructor(openUsage: () => void) {
    this.root.type = 'button';
    this.root.hidden = true;
    this.root.addEventListener('click', openUsage);
  }

  show(usage: UsageSnapshot | null): void {
    const shown: UsageLimit | null = higherLimit(usage);
    this.root.hidden = shown === null;
    if (shown === null) return;
    const percent: number = Math.round(shown.percent);
    this.root.textContent = `${percent}%`;
    const expected: number | null = evenPaceNow(shown);
    this.root.dataset['level'] = expected === null ? 'ok' : weeklyLevel(shown.percent, expected);
    const pace: string = expected === null ? '' : `, an even pace is ${Math.round(expected)}%`;
    this.root.title = `${shown.label}: ${percent}% used${pace} (the higher of the week and the 5-hour session). Click for details`;
  }
}

// The weekly limit wins a tie: it is the one that cannot be waited out in hours.
export function higherLimit(usage: UsageSnapshot | null): UsageLimit | null {
  const weekly: UsageLimit | undefined = usage?.limits.find((limit: UsageLimit) => limit.label === WEEKLY_ALL_LABEL);
  const session: UsageLimit | undefined = usage?.limits.find((limit: UsageLimit) => limit.label === SESSION_LABEL);
  if (weekly === undefined) return session ?? null;
  return session !== undefined && session.percent > weekly.percent ? session : weekly;
}

// Without a reset time there is no window to pace, so the number stays neutral.
function evenPaceNow(limit: UsageLimit): number | null {
  if (limit.resetsAt === null) return null;
  if (limit.label === SESSION_LABEL) return elapsedPercent(limit.resetsAt, Date.now());
  return buildPaceModel(limit.resetsAt, [], Date.now()).expectedNow;
}

// The session is not limited to working hours, so its even pace is simply the share of the 5 hours that has passed.
export function elapsedPercent(resetsAt: number, now: number): number {
  const elapsed: number = SESSION_WINDOW_MS - (resetsAt - now);
  return Math.min(FULL_PERCENT, Math.max(0, (elapsed / SESSION_WINDOW_MS) * FULL_PERCENT));
}
