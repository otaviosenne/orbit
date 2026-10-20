import { readFile } from 'node:fs/promises';

// /proc/<pid>/stat fields counted from 1; the command name (field 2) may contain spaces, so parse after ')'.
const FIELDS_BEFORE_STATE: number = 2;
const PARENT_PID_FIELD: number = 4;
const START_TIME_FIELD: number = 22;

export interface ProcessStat {
  readonly parentPid: number;
  readonly startTime: string;
}

export function parseProcessStat(raw: string): ProcessStat | null {
  const commandEnd: number = raw.lastIndexOf(')');
  if (commandEnd === -1) return null;
  const fields: string[] = raw.slice(commandEnd + 1).trim().split(/\s+/);
  const parentPid: string | undefined = fields[PARENT_PID_FIELD - FIELDS_BEFORE_STATE - 1];
  const startTime: string | undefined = fields[START_TIME_FIELD - FIELDS_BEFORE_STATE - 1];
  if (parentPid === undefined || startTime === undefined) return null;
  return { parentPid: Number(parentPid), startTime };
}

export async function readProcessStat(pid: number): Promise<ProcessStat | null> {
  try {
    return parseProcessStat(await readFile(`/proc/${pid}/stat`, 'utf8'));
  } catch {
    return null;
  }
}

// Session files outlive their process and pids get reused, so the start time must match too.
export async function isSameProcess(pid: number, expectedStartTime: string): Promise<boolean> {
  const processStat: ProcessStat | null = await readProcessStat(pid);
  return processStat !== null && processStat.startTime === expectedStartTime;
}
