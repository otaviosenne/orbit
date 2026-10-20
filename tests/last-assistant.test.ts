import { describe, expect, it } from 'vitest';
import { lastAssistantAt } from '../src/core/timeline-history/last-assistant';

describe('lastAssistantAt', () => {
  it('finds the last main-chat assistant write, skipping later records of other kinds', () => {
    const text: string = [
      '{"type":"assistant","timestamp":"2026-10-20T15:50:00Z","message":{}}',
      '{"type":"assistant","timestamp":"2026-10-20T15:57:00Z","message":{}}',
      '{"type":"assistant","isSidechain":true,"timestamp":"2026-10-20T16:05:00Z","message":{}}',
      '{"type":"custom-title","customTitle":"RELEASE NOTES"}',
      '{"type":"user","timestamp":"2026-10-20T16:20:00Z","message":{"content":"/exit"}}',
    ].join('\n');
    expect(lastAssistantAt(text)).toBe(Date.parse('2026-10-20T15:57:00Z'));
  });

  it('is null when Claude never wrote in the text read', () => {
    expect(lastAssistantAt('{"type":"user","timestamp":"2026-10-20T16:20:00Z"}\n')).toBeNull();
  });
});
