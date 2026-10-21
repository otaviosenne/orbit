// /proc/<pid>/stat fields counted from 1; the command name (field 2) may contain spaces, so parse after the last ')'.
const FIELDS_BEFORE_STATE: number = 2;
const PARENT_PID_FIELD: number = 4;
const USER_TIME_FIELD: number = 14;
const SYSTEM_TIME_FIELD: number = 15;
const START_TIME_FIELD: number = 22;

// One process as a resource sample needs it; cpuTicks already sums every thread of the process.
export interface ProcessSample {
  readonly pid: number;
  readonly parentPid: number;
  // Ticks after boot; with the pid it tells a reused pid from the process seen last time.
  readonly startTime: string;
  readonly cpuTicks: number;
}

export function parseProcessSample(pid: number, raw: string): ProcessSample | null {
  const commandEnd: number = raw.lastIndexOf(')');
  if (commandEnd === -1) return null;
  const fields: string[] = raw.slice(commandEnd + 1).trim().split(/\s+/);
  const field = (number: number): string | undefined => fields[number - FIELDS_BEFORE_STATE - 1];
  const parentPid: number = Number(field(PARENT_PID_FIELD));
  const userTicks: number = Number(field(USER_TIME_FIELD));
  const systemTicks: number = Number(field(SYSTEM_TIME_FIELD));
  const startTime: string | undefined = field(START_TIME_FIELD);
  if (startTime === undefined || ![parentPid, userTicks, systemTicks].every(Number.isFinite)) return null;
  return { pid, parentPid, startTime, cpuTicks: userTicks + systemTicks };
}
