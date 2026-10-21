import type { ProcessSample } from './process-sample';

export function childrenByParent(samples: readonly ProcessSample[]): Map<number, number[]> {
  const children: Map<number, number[]> = new Map();
  for (const sample of samples) {
    const siblings: number[] | undefined = children.get(sample.parentPid);
    if (siblings === undefined) children.set(sample.parentPid, [sample.pid]);
    else siblings.push(sample.pid);
  }
  return children;
}

// The root and everything below it. A chat started from another chat's shell is a tree of its own, so the walk stops
// at chat roots below this one and no process is counted for two chats.
export function collectTree(rootPid: number, children: ReadonlyMap<number, readonly number[]>, chatRoots: ReadonlySet<number>): number[] {
  const tree: number[] = [];
  const pending: number[] = [rootPid];
  while (pending.length > 0) {
    const pid: number = pending.pop() as number;
    tree.push(pid);
    for (const child of children.get(pid) ?? []) if (!chatRoots.has(child)) pending.push(child);
  }
  return tree;
}

export interface ChatRoot {
  readonly sessionId: string;
  readonly pid: number;
}

export interface ChatTree {
  readonly root: ChatRoot;
  readonly pids: readonly number[];
}

// One tree per chat whose claude process is still running; the kitty window above it is never part of it.
export function chatTrees(roots: readonly ChatRoot[], samples: readonly ProcessSample[]): ChatTree[] {
  const running: Set<number> = new Set(samples.map((sample: ProcessSample) => sample.pid));
  const rootPids: Set<number> = new Set(roots.map((root: ChatRoot) => root.pid));
  const children: Map<number, number[]> = childrenByParent(samples);
  return roots
    .filter((root: ChatRoot) => running.has(root.pid))
    .map((root: ChatRoot): ChatTree => ({ root, pids: collectTree(root.pid, children, rootPids) }));
}
