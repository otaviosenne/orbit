import { describe, expect, it } from 'vitest';
import { extractTranscript } from '../src/core/transcript-extractor';
import type { TranscriptRecord } from '../src/core/transcript-record';

const noNames = (): string | null => null;

describe('extractTranscript', () => {
  it('keeps what was said and drops harness noise and subagent records', () => {
    const records: TranscriptRecord[] = [
      { type: 'user', uuid: 'u1', message: { content: 'hello' } },
      { type: 'user', isMeta: true, message: { content: '[Image: original 1080x2400]' } },
      { type: 'user', message: { content: '<system-reminder>noise</system-reminder>' } },
      { type: 'assistant', isSidechain: true, message: { content: [{ type: 'text', text: 'subagent' }] } },
      { type: 'assistant', uuid: 'a1', message: { content: [{ type: 'thinking' }, { type: 'text', text: 'hi there' }] } },
    ];
    expect(extractTranscript(records, 10, noNames).map((item) => [item.kind, item.kind === 'message' ? item.text : ''])).toEqual([
      ['message', 'hello'],
      ['message', 'hi there'],
    ]);
  });

  it('reads an agent transcript, which is all sidechain', () => {
    const records: TranscriptRecord[] = [
      { type: 'user', isSidechain: true, uuid: 'u1', message: { content: 'find the bug' } },
      { type: 'assistant', isSidechain: true, uuid: 'a1', message: { content: [{ type: 'text', text: 'found it' }] } },
    ];
    expect(extractTranscript(records, 10, noNames, new Map(), 'agent').map((item) => (item.kind === 'message' ? item.text : ''))).toEqual([
      'find the bug',
      'found it',
    ]);
  });

  it('pairs a tool call with its result and summarizes it', () => {
    const records: TranscriptRecord[] = [
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'git status', description: 'Show status' } }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'clean', is_error: false }] } },
    ];
    expect(extractTranscript(records, 10, noNames)).toMatchObject([
      { kind: 'tool', name: 'Bash', summary: 'Show status', input: 'git status', output: 'clean', isError: false },
    ]);
  });

  it('shows messages to and from other chats, naming the target chat by its pid', () => {
    const records: TranscriptRecord[] = [
      { type: 'user', isMeta: true, origin: { kind: 'peer', name: 'RELEASES', body: 'v0.4.0 is out' }, message: { content: 'Another Claude session sent a message' } },
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 's1', name: 'SendMessage', input: { to: 'uds:/run/user/1000/cc-socks/5604.sock', message: 'ok' } }] } },
    ];
    const names = (pid: number): string | null => (pid === 5604 ? 'RELEASES' : null);
    expect(extractTranscript(records, 10, names)).toMatchObject([
      { kind: 'peer', direction: 'in', chat: 'RELEASES', text: 'v0.4.0 is out' },
      { kind: 'peer', direction: 'out', chat: 'RELEASES', text: 'ok' },
    ]);
  });

  it('turns agent notifications, slash commands and turn durations into notices', () => {
    const records: TranscriptRecord[] = [
      { type: 'user', message: { content: '<task-notification><status>failed</status><summary>Agent "P1" failed</summary><result>stalled</result></task-notification>' } },
      { type: 'user', message: { content: '<command-name>/color</command-name><command-args>orange</command-args>' } },
      { type: 'system', subtype: 'turn_duration', durationMs: 9_240_000 },
    ];
    expect(extractTranscript(records, 10, noNames)).toMatchObject([
      { kind: 'notice', tone: 'error', title: 'Agent "P1" failed', detail: 'stalled' },
      { kind: 'notice', tone: 'info', title: '/color orange', detail: null },
      { kind: 'turn', durationMs: 9_240_000 },
    ]);
  });
});
