import { describe, expect, it } from 'vitest';
import { IDLE_CONFIRM_MS, isShutdownDue, nextIdleSince } from '../src/main/shutdown/shutdown-decision';
import { countdownText, nextOccurrence, suggestedTime } from '../src/renderer/views/computer/shutdown-time';
import { parseShutdownPlan } from '../src/shared/shutdown-plan';

const NOON: number = new Date(2026, 10, 3, 12, 0).getTime();

describe('when a planned shutdown is due', () => {
  it('waits until no chat has worked for a while, so a pause between turns does not count', () => {
    let idleSince: number | null = nextIdleSince(null, 2, 0);
    expect(idleSince).toBeNull();
    idleSince = nextIdleSince(idleSince, 0, 1000);
    expect(isShutdownDue({ at: null, whenIdle: true }, idleSince, 1000 + IDLE_CONFIRM_MS - 1)).toBe(false);
    expect(isShutdownDue({ at: null, whenIdle: true }, idleSince, 1000 + IDLE_CONFIRM_MS)).toBe(true);
    expect(nextIdleSince(idleSince, 1, 5000)).toBeNull();
  });

  it('shuts down at the time even with chats working, and at whichever comes first with both', () => {
    expect(isShutdownDue({ at: NOON, whenIdle: false }, null, NOON - 1)).toBe(false);
    expect(isShutdownDue({ at: NOON, whenIdle: false }, null, NOON)).toBe(true);
    expect(isShutdownDue({ at: NOON, whenIdle: true }, null, NOON)).toBe(true);
    expect(isShutdownDue({ at: NOON, whenIdle: true }, 0, IDLE_CONFIRM_MS)).toBe(true);
  });
});

describe('the plan from the page', () => {
  it('takes a time, waiting for the chats, or both, and nothing else', () => {
    expect(parseShutdownPlan({ at: NOON, whenIdle: true })).toEqual({ at: NOON, whenIdle: true });
    expect(parseShutdownPlan({ at: null, whenIdle: true })).toEqual({ at: null, whenIdle: true });
    expect(parseShutdownPlan({ at: null, whenIdle: false })).toBeNull();
    expect(parseShutdownPlan({ at: 'noon', whenIdle: true })).toBeNull();
    expect(parseShutdownPlan('now')).toBeNull();
  });

  it('reads a clock time as its next occurrence', () => {
    const morning: Date = new Date(2026, 10, 3, 9, 30);
    expect(nextOccurrence('12:00', morning)).toBe(NOON);
    expect(nextOccurrence('08:00', morning)).toBe(new Date(2026, 10, 4, 8, 0).getTime());
    expect(nextOccurrence('noon', morning)).toBeNull();
    expect(suggestedTime(morning)).toBe('11:00');
    expect(countdownText(42_000)).toBe('0:42');
  });
});
