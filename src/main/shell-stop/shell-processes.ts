// One running process as /proc shows it; `outputs` holds where its stdout and stderr point (read for the chat's children only).
export interface ProcessEntry {
  readonly pid: number;
  readonly parentPid: number;
  readonly startTime: string;
  readonly outputs: readonly string[];
}

// A process to signal, with its start time so a pid reused meanwhile is never hit.
export interface ProcessRef {
  readonly pid: number;
  readonly startTime: string;
}

// Claude Code starts each background shell as a direct child of the chat with stdout and stderr on the task's output
// file, which names the task id: that is the exact handle. Its own children may sit in other process groups and are
// reparented once it dies, so the whole subtree is collected now, before any signal.
export function selectShellProcesses(entries: readonly ProcessEntry[], chatPid: number, outputFile: string): ProcessRef[] {
  const roots: ProcessEntry[] = entries.filter((entry: ProcessEntry) => entry.parentPid === chatPid && entry.outputs.includes(outputFile));
  const children: Map<number, ProcessEntry[]> = childrenByParent(entries);
  const selected: ProcessRef[] = [];
  const pending: ProcessEntry[] = [...roots];
  while (pending.length > 0) {
    const entry: ProcessEntry = pending.pop() as ProcessEntry;
    selected.push({ pid: entry.pid, startTime: entry.startTime });
    pending.push(...(children.get(entry.pid) ?? []));
  }
  return selected;
}

function childrenByParent(entries: readonly ProcessEntry[]): Map<number, ProcessEntry[]> {
  const children: Map<number, ProcessEntry[]> = new Map();
  for (const entry of entries) children.set(entry.parentPid, [...(children.get(entry.parentPid) ?? []), entry]);
  return children;
}
