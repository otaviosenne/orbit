import type { UsageLimit, UsageShare, UsageSnapshot } from '../shared/types';
import { WEEKLY_ALL_LABEL } from '../shared/usage-labels';
import type { RawLimit, RawShare, RawUsage } from './usage-client';

const LIMIT_LABELS: Readonly<Record<string, string>> = {
  session: 'Current session',
  weekly_all: WEEKLY_ALL_LABEL,
};

export function toUsageSnapshot(raw: RawUsage, fetchedAt: number): UsageSnapshot {
  return {
    limits: (raw.limits ?? []).map(toLimit),
    breakdown: (raw.seven_day_breakdown?.rows ?? []).map(toShare),
    weeklyHistory: [],
    fetchedAt,
    error: null,
  };
}

function toLimit(limit: RawLimit): UsageLimit {
  return {
    label: limitLabel(limit),
    percent: limit.percent,
    resetsAt: limit.resets_at === null ? null : Date.parse(limit.resets_at),
  };
}

function limitLabel(limit: RawLimit): string {
  const model: string | null | undefined = limit.scope?.model?.display_name;
  if (model) return `This week, ${model}`;
  return LIMIT_LABELS[limit.kind] ?? limit.kind;
}

function toShare(share: RawShare): UsageShare {
  return { label: share.display_name, percent: share.percent };
}
