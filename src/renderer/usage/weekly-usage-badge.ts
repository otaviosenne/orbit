import type { UsageLimit, UsageSnapshot } from '../../shared/types';
import { WEEKLY_ALL_LABEL } from '../../shared/usage-labels';
import { element } from '../dom';
import { weeklyLevel } from './weekly-level';

// The week's all-models usage beside Resume, as a bare percentage colored by how close the limit is.
export class WeeklyUsageBadge {
  readonly root: HTMLSpanElement = element('span', 'weekly-usage');

  constructor() {
    this.root.hidden = true;
  }

  show(usage: UsageSnapshot | null): void {
    const weekly: UsageLimit | undefined = usage?.limits.find((limit: UsageLimit) => limit.label === WEEKLY_ALL_LABEL);
    this.root.hidden = weekly === undefined;
    if (weekly === undefined) return;
    const percent: number = Math.round(weekly.percent);
    this.root.textContent = `${percent}%`;
    this.root.dataset['level'] = weeklyLevel(percent);
    this.root.title = `${WEEKLY_ALL_LABEL}: ${percent}% used`;
  }
}
