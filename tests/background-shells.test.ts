import { describe, expect, it } from 'vitest';
import { extractRunningShells } from '../src/core/shells/background-shells';
import type { TranscriptRecord } from '../src/core/transcript-record';

// Shapes copied from real transcripts: the Bash call, its result naming the background task, and how it ends.
function bashCall(id: string, command: string, extra: Record<string, unknown> = {}): TranscriptRecord {
  return {
    type: 'assistant',
    timestamp: '2026-10-20T20:25:00.000Z',
    message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command, ...extra } }] },
  };
}

function backgroundResult(toolUseId: string, taskId: string): TranscriptRecord {
  return {
    type: 'user',
    timestamp: '2026-10-20T20:25:01.000Z',
    toolUseResult: { stdout: '', stderr: '', interrupted: false, backgroundTaskId: taskId },
    message: { content: [{ type: 'tool_result', tool_use_id: toolUseId, content: `Command running in background with ID: ${taskId}.` }] },
  };
}

function notification(taskId: string, status: string): TranscriptRecord {
  return {
    type: 'user',
    timestamp: '2026-10-20T20:28:21.000Z',
    origin: { kind: 'task-notification' },
    message: { content: `<task-notification>\n<task-id>${taskId}</task-id>\n<tool-use-id>toolu_x</tool-use-id>\n<status>${status}</status>\n<summary>Background command finished</summary>\n</task-notification>` },
  };
}

const SLEEP_CALL: TranscriptRecord = bashCall('toolu_sleep', 'sleep 200', { description: 'Sleep 200 seconds in background', run_in_background: true });
const SLEEP_STARTED: TranscriptRecord = backgroundResult('toolu_sleep', 'bts0ia0g2');

describe('extractRunningShells', () => {
  it('lists a run_in_background command with its description and the time it was called', () => {
    expect(extractRunningShells([SLEEP_CALL, SLEEP_STARTED])).toEqual([
      { id: 'bts0ia0g2', command: 'sleep 200', description: 'Sleep 200 seconds in background', startedAt: Date.parse('2026-10-20T20:25:00.000Z') },
    ]);
  });

  it('lists a command moved to the background by its timeout, which had no flag or description', () => {
    expect(extractRunningShells([bashCall('toolu_build', 'npm run build'), backgroundResult('toolu_build', 'b8eji2lio')])).toMatchObject([
      { id: 'b8eji2lio', command: 'npm run build', description: null },
    ]);
  });

  it('ignores a foreground command', () => {
    const result: TranscriptRecord = {
      type: 'user',
      toolUseResult: { stdout: 'ok', stderr: '' },
      message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_ls', content: 'ok' }] },
    };
    expect(extractRunningShells([bashCall('toolu_ls', 'ls'), result])).toEqual([]);
  });

  it.each(['completed', 'failed', 'killed', 'stopped'])('drops a shell whose notification says %s', (status: string) => {
    expect(extractRunningShells([SLEEP_CALL, SLEEP_STARTED, notification('bts0ia0g2', status)])).toEqual([]);
  });

  it('drops a shell once a queued notification names it, before the chat takes it in', () => {
    const queued: TranscriptRecord & { readonly content: string } = {
      type: 'queue-operation',
      content: '<task-notification>\n<task-id>bts0ia0g2</task-id>\n<status>completed</status>\n</task-notification>',
    };
    expect(extractRunningShells([SLEEP_CALL, SLEEP_STARTED, queued])).toEqual([]);
  });

  it('drops a shell stopped with TaskStop', () => {
    const stop: TranscriptRecord = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'toolu_stop', name: 'TaskStop', input: { task_id: 'bts0ia0g2' } }] } };
    const stopped: TranscriptRecord = {
      type: 'user',
      toolUseResult: { message: 'Successfully stopped task: bts0ia0g2 (sleep 200)', task_id: 'bts0ia0g2', task_type: 'local_bash' },
      message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_stop', content: 'Successfully stopped task' }] },
    };
    expect(extractRunningShells([SLEEP_CALL, SLEEP_STARTED, stop, stopped])).toEqual([]);
  });

  it("keeps the shell when another task ends, or when Claude only quotes a notification", () => {
    const quoted: TranscriptRecord = {
      type: 'assistant',
      message: { content: [{ type: 'text', text: '<task-notification><task-id>bts0ia0g2</task-id><status>completed</status>' }] },
    };
    expect(extractRunningShells([SLEEP_CALL, SLEEP_STARTED, notification('other', 'completed'), quoted])).toHaveLength(1);
  });
});
