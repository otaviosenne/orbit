import type { UsageLimit, UsageShare, UsageSnapshot } from '../../shared/types';
import { element } from '../dom';
import { formatDuration, formatReset } from '../format';
import { WEEKLY_ALL_LABEL } from '../../shared/usage-labels';
import { renderPaceChart } from '../usage/pace-chart';

// Past this share of a limit the meter turns orange, so a near-empty window is noticed early.
const WARNING_PERCENT: number = 80;

export function renderUsageSection(usage: UsageSnapshot | null, now: number): HTMLElement {
  const section: HTMLElement = element('section', 'settings-section');
  section.append(element('h2', 'settings-heading', 'Usage'));
  if (usage === null) return withChild(section, element('p', 'settings-note', 'Loading usage...'));
  const limits: HTMLDivElement = element('div', 'settings-group');
  limits.append(...usage.limits.map((limit: UsageLimit) => renderLimit(limit, now)));
  section.append(limits);
  const weekly: UsageLimit | undefined = usage.limits.find((limit: UsageLimit) => limit.label === WEEKLY_ALL_LABEL);
  if (weekly?.resetsAt != null) section.append(element('h3', 'settings-subheading', 'Weekly pace'), renderPaceChart(weekly.resetsAt, usage.weeklyHistory, now));
  if (usage.breakdown.length > 0) section.append(element('h3', 'settings-subheading', 'Where this week went'), renderBreakdown(usage.breakdown));
  section.append(element('p', 'settings-note', footnote(usage, now)));
  return section;
}

function renderLimit(limit: UsageLimit, now: number): HTMLElement {
  const row: HTMLDivElement = element('div', `settings-row limit${limit.percent >= WARNING_PERCENT ? ' is-high' : ''}`);
  const text: HTMLDivElement = element('div', 'limit-text');
  text.append(element('span', 'limit-label', limit.label));
  if (limit.resetsAt !== null) text.append(element('span', 'limit-reset', formatReset(limit.resetsAt, now)));
  const meter: HTMLDivElement = element('div', 'meter');
  const fill: HTMLDivElement = element('div', 'meter-fill');
  fill.style.width = `${Math.min(100, limit.percent)}%`;
  meter.append(fill);
  row.append(text, meter, element('span', 'limit-percent', `${Math.round(limit.percent)}%`));
  return row;
}

function renderBreakdown(shares: readonly UsageShare[]): HTMLElement {
  const group: HTMLDivElement = element('div', 'settings-group');
  for (const share of shares) {
    const row: HTMLDivElement = element('div', 'settings-row share');
    row.append(element('span', 'share-label', share.label), element('span', 'share-percent', `${Math.round(share.percent)}%`));
    group.append(row);
  }
  return group;
}

function footnote(usage: UsageSnapshot, now: number): string {
  const updated: string = usage.fetchedAt === null ? 'Not loaded yet' : `Updated ${formatDuration(now - usage.fetchedAt)} ago`;
  return usage.error === null ? updated : `${updated}. Last attempt failed: ${usage.error}`;
}

function withChild(parent: HTMLElement, child: HTMLElement): HTMLElement {
  parent.append(child);
  return parent;
}
