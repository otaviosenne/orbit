import { readdir, readFile, readlink } from 'node:fs/promises';
import type { ProcessEntry, ProcessRef } from './shell-processes';

const PROC: string = '/proc';
const PID_NAME: RegExp = /^\d+$/;
// /proc/<pid>/stat fields counted from 1; the command name (field 2) may contain spaces, so they are read after ')'.
const FIELDS_BEFORE_STATE: number = 2;
const STATE_FIELD: number = 3;
const PARENT_PID_FIELD: number = 4;
const START_TIME_FIELD: number = 22;
// A zombie has already exited; it only waits for its parent to collect it.
const ZOMBIE_STATE: string = 'Z';
const STDOUT_FD: number = 1;
const STDERR_FD: number = 2;

interface StatFields {
  readonly state: string;
  readonly parentPid: number;
  readonly startTime: string;
}

// Every process, with stdout/stderr targets read only for the chat's direct children, where background shells live.
export async function readProcessTable(chatPid: number): Promise<ProcessEntry[]> {
  const pids: number[] = (await readdir(PROC)).filter((name: string) => PID_NAME.test(name)).map(Number);
  const entries: (ProcessEntry | null)[] = await Promise.all(pids.map((pid: number) => readEntry(pid, chatPid)));
  return entries.filter((entry: ProcessEntry | null): entry is ProcessEntry => entry !== null);
}

// Still the same process (pid not reused) and not already exited.
export async function isAlive(process: ProcessRef): Promise<boolean> {
  const stat: StatFields | null = await readStat(process.pid);
  return stat !== null && stat.startTime === process.startTime && stat.state !== ZOMBIE_STATE;
}

async function readEntry(pid: number, chatPid: number): Promise<ProcessEntry | null> {
  const stat: StatFields | null = await readStat(pid);
  if (stat === null) return null;
  const outputs: string[] = stat.parentPid === chatPid ? await readOutputs(pid) : [];
  return { pid, parentPid: stat.parentPid, startTime: stat.startTime, outputs };
}

async function readOutputs(pid: number): Promise<string[]> {
  const targets: (string | null)[] = await Promise.all(
    [STDOUT_FD, STDERR_FD].map((fd: number) => readlink(`${PROC}/${pid}/fd/${fd}`).catch((): null => null)),
  );
  return targets.filter((target: string | null): target is string => target !== null);
}

async function readStat(pid: number): Promise<StatFields | null> {
  try {
    return parseStat(await readFile(`${PROC}/${pid}/stat`, 'utf8'));
  } catch {
    return null;
  }
}

function parseStat(raw: string): StatFields | null {
  const fields: string[] = raw.slice(raw.lastIndexOf(')') + 1).trim().split(/\s+/);
  const field = (number: number): string | undefined => fields[number - FIELDS_BEFORE_STATE - 1];
  const state: string | undefined = field(STATE_FIELD);
  const parentPid: string | undefined = field(PARENT_PID_FIELD);
  const startTime: string | undefined = field(START_TIME_FIELD);
  if (state === undefined || parentPid === undefined || startTime === undefined) return null;
  return { state, parentPid: Number(parentPid), startTime };
}
