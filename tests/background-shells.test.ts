import { describe, expect, it } from 'vitest';
import { extractShells } from '../src/core/shells/background-shells';
import type { ShellRecord } from '../src/core/shells/background-shells';
import { listedShells, SHELL_LINGER_MS } from '../src/core/shells/shell-reader';
import type { TranscriptRecord } from '../src/core/transcript-record';

// Shapes copied from real transcripts: the Bash call, its result naming the background task, and how it ends.
const SESSION: string = '0a0428ce-d73d-40eb-88e9-2a1668ecaa34';
const OUTPUT: string = `/tmp/claude-1000/-home-senne-Claude/${SESSION}/tasks/boaqlfcrg.output`;
const CALLED_AT: string = '2026-10-21T13:27:22.000Z';
const ENDED_AT: string = '2026-10-21T13:27:47.389Z';

function bashCall(id: string, command: string, extra: Record<string, unknown> = {}): TranscriptRecord {
  return { type: 'assistant', timestamp: CALLED_AT, message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command, ...extra } }] } };
}

function backgroundResult(toolUseId: string, taskId: string): TranscriptRecord {
  return {
    type: 'user',
    timestamp: '2026-10-21T13:27:22.330Z',
    toolUseResult: { stdout: '', stderr: '', interrupted: false, backgroundTaskId: taskId },
    message: {
      content: [{ type: 'tool_result', tool_use_id: toolUseId, content: `Command running in background with ID: ${taskId}. Output is being written to: ${OUTPUT}. You will be notified when it completes.` }],
    },
  };
}

function notificationText(taskId: string, status: string, summary: string): string {
  return `<task-notification>\n<task-id>${taskId}</task-id>\n<tool-use-id>toolu_x</tool-use-id>\n<output-file>${OUTPUT}</output-file>\n<status>${status}</status>\n<summary>${summary}</summary>\n</task-notification>`;
}

function queued(text: string): TranscriptRecord & { readonly content: string } {
  return { type: 'queue-operation', timestamp: ENDED_AT, content: text };
}

function delivered(text: string): TranscriptRecord {
  return { type: 'user', timestamp: '2026-10-21T13:27:47.418Z', origin: { kind: 'task-notification' }, message: { content: text } };
}

const CALL: TranscriptRecord = bashCall('toolu_fail', 'sleep 25; echo failing; exit 3', { description: 'Fails after 25 seconds', run_in_background: true });
const STARTED: TranscriptRecord = backgroundResult('toolu_fail', 'boaqlfcrg');
const FAILED: string = notificationText('boaqlfcrg', 'failed', 'Background command "Fails after 25 seconds" failed with exit code 3');

function only(records: readonly TranscriptRecord[]): ShellRecord | undefined {
  return extractShells(records)[0];
}

describe('extractShells', () => {
  it('lists a run_in_background command as running, with its description, call time and output file', () => {
    expect(extractShells([CALL, STARTED])).toEqual([
      {
        id: 'boaqlfcrg',
        command: 'sleep 25; echo failing; exit 3',
        description: 'Fails after 25 seconds',
        startedAt: Date.parse(CALLED_AT),
        status: 'running',
        endedAt: null,
        exitCode: null,
        outputFile: OUTPUT,
      },
    ]);
  });

  it('lists a command moved to the background by its timeout, which had no flag or description', () => {
    expect(only([bashCall('toolu_build', 'npm run build'), backgroundResult('toolu_build', 'b8eji2lio')])).toMatchObject({ id: 'b8eji2lio', description: null, status: 'running' });
  });

  it('ignores a foreground command', () => {
    const result: TranscriptRecord = { type: 'user', toolUseResult: { stdout: 'ok' }, message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_ls', content: 'ok' }] } };
    expect(extractShells([bashCall('toolu_ls', 'ls'), result])).toEqual([]);
  });

  it('ends a shell at its queued notification, with the status and exit code from its own block', () => {
    expect(only([CALL, STARTED, queued(FAILED), delivered(FAILED)])).toMatchObject({ status: 'failed', exitCode: 3, endedAt: Date.parse(ENDED_AT) });
  });

  it.each([
    ['completed', 'completed'],
    ['killed', 'killed'],
    ['stopped', 'killed'],
  ])('reads a %s notification as %s', (reported: string, shown: string) => {
    expect(only([CALL, STARTED, delivered(notificationText('boaqlfcrg', reported, 'Background command ended'))])?.status).toBe(shown);
  });

  it('never lends one block its neighbour\'s exit code', () => {
    const both: string = `${notificationText('other', 'failed', 'failed with exit code 9')}\n${notificationText('boaqlfcrg', 'completed', 'completed')}`;
    expect(only([CALL, STARTED, delivered(both)])).toMatchObject({ status: 'completed', exitCode: null });
  });

  it('ends a shell stopped with TaskStop as killed', () => {
    const stop: TranscriptRecord = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'toolu_stop', name: 'TaskStop', input: { task_id: 'boaqlfcrg' } }] } };
    const stopped: TranscriptRecord = {
      type: 'user',
      timestamp: ENDED_AT,
      toolUseResult: { message: 'Successfully stopped task: boaqlfcrg', task_id: 'boaqlfcrg', task_type: 'local_bash' },
      message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_stop', content: 'Successfully stopped task' }] },
    };
    expect(only([CALL, STARTED, stop, stopped])).toMatchObject({ status: 'killed', endedAt: Date.parse(ENDED_AT) });
  });

  it('keeps the shell running when Claude only quotes a notification', () => {
    const quoted: TranscriptRecord = { type: 'assistant', message: { content: [{ type: 'text', text: FAILED }] } };
    expect(only([CALL, STARTED, quoted])?.status).toBe('running');
  });
});

describe('listedShells', () => {
  const ended: ShellRecord = { ...(only([CALL, STARTED, queued(FAILED)]) as ShellRecord) };
  const endedAt: number = Date.parse(ENDED_AT);

  it('keeps a finished shell for the linger period, then drops it', () => {
    expect(listedShells([ended], 0, endedAt + SHELL_LINGER_MS - 1)).toHaveLength(1);
    expect(listedShells([ended], 0, endedAt + SHELL_LINGER_MS)).toEqual([]);
  });

  it('drops shells started before the chat process', () => {
    expect(listedShells([ended], endedAt, endedAt)).toEqual([]);
  });
});
