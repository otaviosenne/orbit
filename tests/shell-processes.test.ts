import { describe, expect, it } from 'vitest';
import type { ProcessEntry, ProcessRef } from '../src/main/shell-stop/shell-processes';
import { selectShellProcesses } from '../src/main/shell-stop/shell-processes';

// Modelled on the throwaway chat: claude 194483 runs MCP servers and two background shells, each a bash whose
// stdout and stderr go to its task's output file, with children in process groups of their own.
const CHAT: number = 194483;
const SLEEP_OUTPUT: string = '/tmp/claude-1000/-home-senne-Claude/0a0428ce/tasks/bzpvrxo5z.output';
const LOOP_OUTPUT: string = '/tmp/claude-1000/-home-senne-Claude/0a0428ce/tasks/bueikwkij.output';

function entry(pid: number, parentPid: number, outputs: readonly string[] = []): ProcessEntry {
  return { pid, parentPid, startTime: `t${pid}`, outputs };
}

const TABLE: readonly ProcessEntry[] = [
  entry(CHAT, 194429),
  entry(194859, CHAT, ['socket:[358384]']),
  entry(200939, CHAT, [SLEEP_OUTPUT, SLEEP_OUTPUT]),
  entry(201001, 200939),
  entry(201029, CHAT, [LOOP_OUTPUT, LOOP_OUTPUT]),
  entry(205472, 201029),
  entry(205473, 205472),
  // Another chat's shell writing the same kind of file: never a match, since its parent is not this chat.
  entry(300001, 299999, [SLEEP_OUTPUT]),
];

function pids(processes: readonly ProcessRef[]): number[] {
  return processes.map((process: ProcessRef) => process.pid).sort((a: number, b: number) => a - b);
}

describe('selectShellProcesses', () => {
  it("takes the chat's child writing to the task's output file and its whole subtree, with start times", () => {
    const selected: ProcessRef[] = selectShellProcesses(TABLE, CHAT, LOOP_OUTPUT);
    expect(pids(selected)).toEqual([201029, 205472, 205473]);
    expect(selected).toContainEqual({ pid: 201029, startTime: 't201029' });
  });

  it('leaves the other shells, the MCP servers and other chats alone', () => {
    expect(pids(selectShellProcesses(TABLE, CHAT, SLEEP_OUTPUT))).toEqual([200939, 201001]);
  });

  it('finds nothing once the command has ended', () => {
    expect(selectShellProcesses(TABLE.filter((process: ProcessEntry) => process.pid !== 200939), CHAT, SLEEP_OUTPUT)).toEqual([]);
  });
});
