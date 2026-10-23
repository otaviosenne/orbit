import type { UsageLimit, UsageSnapshot } from '../../shared/types';
import { WEEKLY_ALL_LABEL } from '../../shared/usage-labels';
import { element } from '../dom';
import { buildPaceModel } from './pace-model';
import { weeklyLevel } from './weekly-level';

// The week's all-models usage beside Resume, as a bare percentage colored by how it compares with an even pace over
// working hours (green far below, neutral near it, then yellow, red and purple); clicking it
// opens the full Usage page in Settings.
export class WeeklyUsageBadge {
  readonly root: HTMLButtonElement = element('button', 'weekly-usage');

  constructor(openUsage: () => void) {
    this.root.type = 'button';
    this.root.hidden = true;
    this.root.addEventListener('click', openUsage);
  }

  show(usage: UsageSnapshot | null): void {
    const weekly: UsageLimit | undefined = usage?.limits.find((limit: UsageLimit) => limit.label === WEEKLY_ALL_LABEL);
    this.root.hidden = weekly === undefined;
    if (weekly === undefined) return;
    const percent: number = Math.round(weekly.percent);
    this.root.textContent = `${percent}%`;
    const expected: number | null = evenPaceNow(weekly);
    this.root.dataset['level'] = expected === null ? 'ok' : weeklyLevel(weekly.percent, expected);
    const pace: string = expected === null ? '' : `, an even pace is ${Math.round(expected)}%`;
    this.root.title = `${WEEKLY_ALL_LABEL}: ${percent}% used${pace}. Click for details`;
  }
}

// Without a reset time there is no week to pace, so the number stays neutral.
function evenPaceNow(weekly: UsageLimit): number | null {
  return weekly.resetsAt === null ? null : buildPaceModel(weekly.resetsAt, [], Date.now()).expectedNow;
}
