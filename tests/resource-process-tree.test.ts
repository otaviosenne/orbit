import { describe, expect, it } from 'vitest';
import type { ProcessSample } from '../src/core/resources/process-sample';
import type { ChatTree } from '../src/core/resources/process-tree';
import { chatTrees } from '../src/core/resources/process-tree';

const KITTY: number = 100;
const CHAT: number = 200;
const OTHER_CHAT: number = 300;

function sample(pid: number, parentPid: number): ProcessSample {
  return { pid, parentPid, startTime: `t${pid}`, cpuTicks: 0 };
}

// kitty runs the chat, which runs an MCP server and a shell with a dev server; the shell also started another chat.
const SAMPLES: readonly ProcessSample[] = [
  sample(KITTY, 1),
  sample(CHAT, KITTY),
  sample(201, CHAT),
  sample(202, CHAT),
  sample(203, 202),
  sample(OTHER_CHAT, 202),
  sample(301, OTHER_CHAT),
  sample(999, 1),
];

function pidsOf(trees: readonly ChatTree[], sessionId: string): number[] {
  return [...(trees.find((tree: ChatTree) => tree.root.sessionId === sessionId)?.pids ?? [])].sort((a: number, b: number) => a - b);
}

describe('chatTrees', () => {
  it('takes the chat and all its descendants, never the kitty window above it', () => {
    const trees: ChatTree[] = chatTrees([{ sessionId: 'a', pid: CHAT }], SAMPLES);
    expect(pidsOf(trees, 'a')).toEqual([CHAT, 201, 202, 203, OTHER_CHAT, 301]);
  });

  it('leaves a chat started below another one to its own tree, so nothing is counted twice', () => {
    const trees: ChatTree[] = chatTrees([{ sessionId: 'a', pid: CHAT }, { sessionId: 'b', pid: OTHER_CHAT }], SAMPLES);
    expect(pidsOf(trees, 'a')).toEqual([CHAT, 201, 202, 203]);
    expect(pidsOf(trees, 'b')).toEqual([OTHER_CHAT, 301]);
  });

  it('drops a chat whose process is gone', () => {
    expect(chatTrees([{ sessionId: 'gone', pid: 4242 }], SAMPLES)).toEqual([]);
  });
});
