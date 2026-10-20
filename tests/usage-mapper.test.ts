import { describe, expect, it } from 'vitest';
import { toUsageSnapshot } from '../src/core/usage-mapper';

describe('toUsageSnapshot', () => {
  it('labels session, weekly and model-scoped limits and keeps the weekly breakdown', () => {
    const snapshot = toUsageSnapshot(
      {
        limits: [
          { kind: 'session', percent: 47, resets_at: '2026-10-20T16:40:00Z', scope: null },
          { kind: 'weekly_all', percent: 27, resets_at: '2026-10-26T20:00:00Z', scope: null },
          { kind: 'weekly_scoped', percent: 0, resets_at: null, scope: { model: { display_name: 'Fable' } } },
        ],
        seven_day_breakdown: { rows: [{ display_name: 'Claude Code', percent: 100 }] },
      },
      1,
    );
    expect(snapshot.limits.map((limit) => [limit.label, limit.percent, limit.resetsAt])).toEqual([
      ['Current session', 47, Date.parse('2026-10-20T16:40:00Z')],
      ['This week, all models', 27, Date.parse('2026-10-26T20:00:00Z')],
      ['This week, Fable', 0, null],
    ]);
    expect(snapshot.breakdown).toEqual([{ label: 'Claude Code', percent: 100 }]);
  });
});
