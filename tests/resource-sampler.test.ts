import { describe, expect, it } from 'vitest';
import type { ResourceSnapshot } from '../src/shared/chat-resources';
import type { ProcessSample } from '../src/core/resources/process-sample';
import type { ChatRoot } from '../src/core/resources/process-tree';
import type { ResourceSource } from '../src/core/resources/proc-source';
import { MEMORY_REFRESH_MS } from '../src/core/resources/memory-book';
import { ResourceSampler } from '../src/core/resources/resource-sampler';

const MB: number = 1024 * 1024;
const CHAT: ChatRoot = { sessionId: 's1', pid: 50 };

// A machine where the chat and its shell burn a known number of ticks per read, on a clock the test moves.
class FakeSource implements ResourceSource {
  clock: number = 0;
  reads: number = 0;
  memoryReads: number = 0;
  private ticks: number = 0;

  constructor(private readonly ticksPerRead: number) {}

  chatRoots(): Promise<ChatRoot[]> {
    return Promise.resolve([CHAT]);
  }

  processes(): Promise<ProcessSample[]> {
    this.reads += 1;
    this.ticks += this.ticksPerRead;
    return Promise.resolve([
      { pid: 1, parentPid: 0, startTime: '1', cpuTicks: 0 },
      { pid: CHAT.pid, parentPid: 1, startTime: '9', cpuTicks: this.ticks },
      { pid: 51, parentPid: CHAT.pid, startTime: '10', cpuTicks: this.ticks },
    ]);
  }

  memoryBytes(pids: readonly number[]): Promise<number[]> {
    this.memoryReads += pids.length;
    return Promise.resolve(pids.map((): number => 100 * MB));
  }

  coreCount(): number {
    return 6;
  }

  monotonicMs(): number {
    return this.clock;
  }

  wait(ms: number): Promise<void> {
    this.clock += ms;
    return Promise.resolve();
  }
}

describe('ResourceSampler', () => {
  it('measures the first call over a short warm-up instead of the process lifetime', async () => {
    const source: FakeSource = new FakeSource(25);
    const snapshot: ResourceSnapshot = await new ResourceSampler(source).snapshot();
    // Two processes, 25 ticks each over the 500 ms warm-up: 0.5 core each.
    expect(snapshot.chats).toEqual([{ sessionId: 's1', pid: CHAT.pid, cpuPercent: 100, memoryBytes: 200 * MB, processCount: 2 }]);
    expect(snapshot.coreCount).toBe(6);
  });

  it('measures later calls since the previous one', async () => {
    const source: FakeSource = new FakeSource(100);
    const sampler: ResourceSampler = new ResourceSampler(source);
    await sampler.snapshot();
    source.clock += 2000;
    const snapshot: ResourceSnapshot = await sampler.snapshot();
    // 100 ticks per process over 2 s: half a core each.
    expect(snapshot.chats[0]?.cpuPercent).toBe(100);
    expect(source.reads).toBe(3);
  });

  it('answers a call right after another from the last sample, without reading /proc', async () => {
    const source: FakeSource = new FakeSource(10);
    const sampler: ResourceSampler = new ResourceSampler(source);
    const first: ResourceSnapshot = await sampler.snapshot();
    source.clock += 100;
    expect(await sampler.snapshot()).toBe(first);
    expect(source.reads).toBe(2);
  });

  it('warms up again after a long pause instead of averaging over it', async () => {
    const source: FakeSource = new FakeSource(50);
    const sampler: ResourceSampler = new ResourceSampler(source);
    await sampler.snapshot();
    source.clock += 60_000;
    const snapshot: ResourceSnapshot = await sampler.snapshot();
    expect(snapshot.chats[0]?.cpuPercent).toBe(200);
    expect(source.reads).toBe(4);
  });

  it('re-reads memory only once it is old, while CPU follows every sample', async () => {
    const source: FakeSource = new FakeSource(10);
    const sampler: ResourceSampler = new ResourceSampler(source);
    await sampler.snapshot();
    source.clock += 2000;
    await sampler.snapshot();
    expect(source.memoryReads).toBe(2);
    source.clock += MEMORY_REFRESH_MS;
    await sampler.snapshot();
    expect(source.memoryReads).toBe(4);
  });
});
