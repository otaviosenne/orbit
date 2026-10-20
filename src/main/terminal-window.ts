import { readProcessStat } from '../core/process-identity';
import type { ProcessStat } from '../core/process-identity';
import { runCommand } from './run-command';

// Chats may sit under a shell inside kitty, so the window can be a few ancestors up.
const MAX_ANCESTOR_DEPTH: number = 8;

interface HyprlandClient {
  readonly pid: number;
  readonly monitor: number;
  readonly workspace: { readonly id: number };
}

interface HyprlandMonitor {
  readonly id: number;
  readonly activeWorkspace: { readonly id: number };
}

export interface WindowPlacement {
  readonly workspace: number;
  readonly visibleWorkspace: number;
}

// Returns the pid of the kitty process whose window shows this chat.
export async function findTerminalWindowPid(chatPid: number): Promise<number | null> {
  const windowPids: Set<number> = await listWindowPids();
  let current: number = chatPid;
  for (let depth: number = 0; depth < MAX_ANCESTOR_DEPTH; depth++) {
    const processStat: ProcessStat | null = await readProcessStat(current);
    if (processStat === null) return null;
    current = processStat.parentPid;
    if (windowPids.has(current)) return current;
  }
  return null;
}

export async function activeWindowPid(): Promise<number | null> {
  const active: { readonly pid?: number } = JSON.parse(await runCommand('hyprctl', ['activewindow', '-j'])) as { readonly pid?: number };
  return active.pid ?? null;
}

export async function focusWindow(windowPid: number): Promise<void> {
  await runCommand('hyprctl', ['dispatch', 'focuswindow', `pid:${windowPid}`]);
}

// Where the window lives and what its monitor is showing right now, so a focus jump can be undone.
export async function windowPlacement(windowPid: number): Promise<WindowPlacement | null> {
  const client: HyprlandClient | undefined = (await listClients()).find((candidate: HyprlandClient) => candidate.pid === windowPid);
  if (client === undefined) return null;
  const monitors: HyprlandMonitor[] = JSON.parse(await runCommand('hyprctl', ['monitors', '-j'])) as HyprlandMonitor[];
  const monitor: HyprlandMonitor | undefined = monitors.find((candidate: HyprlandMonitor) => candidate.id === client.monitor);
  return monitor === undefined ? null : { workspace: client.workspace.id, visibleWorkspace: monitor.activeWorkspace.id };
}

async function listWindowPids(): Promise<Set<number>> {
  return new Set((await listClients()).map((client: HyprlandClient) => client.pid));
}

async function listClients(): Promise<HyprlandClient[]> {
  return JSON.parse(await runCommand('hyprctl', ['clients', '-j'])) as HyprlandClient[];
}
