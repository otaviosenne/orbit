import type { UsageLimit, UsageSnapshot } from '../../shared/types';
import { WEEKLY_ALL_LABEL } from '../../shared/usage-labels';
import { element } from '../dom';
import { weeklyLevel } from './weekly-level';

// The week's all-models usage beside Resume, as a bare percentage colored by how close the limit is; clicking it
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
    this.root.dataset['level'] = weeklyLevel(percent);
    this.root.title = `${WEEKLY_ALL_LABEL}: ${percent}% used. Click for details`;
  }
}
