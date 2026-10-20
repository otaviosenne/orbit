import { describe, expect, it } from 'vitest';
import { turnSpans } from '../src/core/timeline-history/turn-spans';
import type { TranscriptRecord } from '../src/core/transcript-record';

const SECOND: number = 1000;
const MINUTE: number = 60 * SECOND;
const T0: number = Date.parse('2026-10-20T12:00:00Z');

function at(offsetMs: number): string {
  return new Date(T0 + offsetMs).toISOString();
}

function prompt(offsetMs: number, text: string = 'fix the bug', extra: Partial<TranscriptRecord> = {}): TranscriptRecord {
  return { type: 'user', timestamp: at(offsetMs), message: { role: 'user', content: text }, ...extra };
}

function turnEnd(offsetMs: number, durationMs: number, extra: Partial<TranscriptRecord> = {}): TranscriptRecord {
  return { type: 'system', subtype: 'turn_duration', timestamp: at(offsetMs), durationMs, ...extra };
}

describe('turnSpans', () => {
  it('turns each turn_duration record into the stretch that ended at its timestamp', () => {
    const records: TranscriptRecord[] = [prompt(0), turnEnd(18 * SECOND, 18 * SECOND), prompt(10 * MINUTE), turnEnd(12 * MINUTE, 2 * MINUTE)];
    expect(turnSpans(records, T0 + 12 * MINUTE)).toEqual([
      { start: T0, end: T0 + 18 * SECOND },
      { start: T0 + 10 * MINUTE, end: T0 + 12 * MINUTE },
    ]);
  });

  it('runs a turn left open when the chat closed from its first prompt to when Claude last wrote', () => {
    const records: TranscriptRecord[] = [turnEnd(MINUTE, MINUTE), prompt(5 * MINUTE), prompt(6 * MINUTE, 'and also this')];
    expect(turnSpans(records, T0 + 9 * MINUTE)).toEqual([
      { start: T0, end: T0 + MINUTE },
      { start: T0 + 5 * MINUTE, end: T0 + 9 * MINUTE },
    ]);
  });

  it('draws nothing for a last prompt Claude never answered', () => {
    expect(turnSpans([turnEnd(MINUTE, MINUTE), prompt(5 * MINUTE)], T0 + MINUTE)).toEqual([{ start: T0, end: T0 + MINUTE }]);
    expect(turnSpans([prompt(5 * MINUTE)], null)).toEqual([]);
  });

  it('ends an interrupted turn at the interruption, which has no turn_duration record', () => {
    const records: TranscriptRecord[] = [
      prompt(0),
      prompt(3 * MINUTE, '[Request interrupted by user]'),
      prompt(10 * MINUTE),
      turnEnd(11 * MINUTE, MINUTE),
    ];
    expect(turnSpans(records, T0 + 11 * MINUTE)).toEqual([
      { start: T0, end: T0 + 3 * MINUTE },
      { start: T0 + 10 * MINUTE, end: T0 + 11 * MINUTE },
    ]);
  });

  it('counts a background task report as starting a turn', () => {
    const notification: string = '<task-notification><task-id>abc</task-id><status>completed</status></task-notification>';
    expect(turnSpans([prompt(0, notification)], T0 + MINUTE)).toEqual([{ start: T0, end: T0 + MINUTE }]);
  });

  it('ignores tool results, harness text, slash commands and subagent records as turn starts', () => {
    const records: TranscriptRecord[] = [
      prompt(0, 'x', { message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] } }),
      prompt(SECOND, '<system-reminder>context</system-reminder>'),
      prompt(2 * SECOND, '<command-name>/color</command-name>'),
      prompt(3 * SECOND, 'from an agent', { isSidechain: true }),
    ];
    expect(turnSpans(records, T0 + MINUTE)).toEqual([]);
  });

  it('merges a queued prompt with the turn that absorbed it', () => {
    const records: TranscriptRecord[] = [turnEnd(2 * MINUTE, 2 * MINUTE), turnEnd(3 * MINUTE, 90 * SECOND)];
    expect(turnSpans(records, T0 + 3 * MINUTE)).toEqual([{ start: T0, end: T0 + 3 * MINUTE }]);
  });

  it('skips subagent turn records and records without a usable time', () => {
    const records: TranscriptRecord[] = [turnEnd(MINUTE, MINUTE, { isSidechain: true }), { type: 'system', subtype: 'turn_duration', durationMs: MINUTE }];
    expect(turnSpans(records, T0 + MINUTE)).toEqual([]);
  });
});
