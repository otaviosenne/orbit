import { describe, expect, it } from 'vitest';
import { classifyAgent } from '../src/core/agent-classifier';
import { extractAgentFacts } from '../src/core/agent-facts';
import { AGENT_QUIET_THRESHOLD_MS } from '../src/core/config';
import type { TranscriptRecord } from '../src/core/transcript-record';

const NOW: number = Date.parse('2026-10-20T12:00:00Z');

const prompt: TranscriptRecord = { type: 'user', timestamp: '2026-10-20T11:00:00Z', message: { content: 'build it' } };
const toolResult: TranscriptRecord = {
  type: 'user',
  timestamp: '2026-10-20T11:10:00Z',
  message: { content: [{ type: 'tool_result' }] },
};
const finalAnswer: TranscriptRecord = {
  type: 'assistant',
  timestamp: '2026-10-20T11:20:00Z',
  message: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'done' }] },
};

describe('extractAgentFacts', () => {
  it('starts the run at the latest real prompt, not at a tool result', () => {
    const facts = extractAgentFacts([prompt, toolResult]);
    expect(facts.runStartedAt).toBe(Date.parse('2026-10-20T11:00:00Z'));
    expect(facts.endedCleanly).toBe(false);
  });

  it('ignores coordinator messages injected mid-run', () => {
    const injected: TranscriptRecord = { ...prompt, isMeta: true, timestamp: '2026-10-20T11:15:00Z' };
    expect(extractAgentFacts([prompt, injected, finalAnswer]).runStartedAt).toBe(Date.parse('2026-10-20T11:00:00Z'));
  });

  it('starts a new run when a finished agent is resumed', () => {
    const resume: TranscriptRecord = { ...prompt, isMeta: true, timestamp: '2026-10-20T11:30:00Z' };
    expect(extractAgentFacts([prompt, finalAnswer, resume, toolResult]).runStartedAt).toBe(
      Date.parse('2026-10-20T11:30:00Z'),
    );
  });

  it('detects a clean final turn', () => {
    expect(extractAgentFacts([prompt, toolResult, finalAnswer]).endedCleanly).toBe(true);
  });
});

describe('classifyAgent', () => {
  it('is done when the last turn ended cleanly even without the finished flag', () => {
    expect(classifyAgent({ finishedFlag: false, endedCleanly: true, lastActivityAt: NOW }, NOW)).toBe('done');
  });

  it('is running while recently active and quiet after the threshold', () => {
    const recent = { finishedFlag: false, endedCleanly: false, lastActivityAt: NOW };
    expect(classifyAgent(recent, NOW)).toBe('running');
    expect(classifyAgent(recent, NOW + AGENT_QUIET_THRESHOLD_MS + 1)).toBe('quiet');
  });
});
