import type { ChatResourceUsage, ResourceSnapshot } from '../../shared/chat-resources';
import type { TickBook } from './cpu-usage';
import { cpuPercent, toTickBook, treeTicksSince } from './cpu-usage';
import { MemoryBook } from './memory-book';
import type { ProcessSample } from './process-sample';
import type { ChatTree } from './process-tree';
import { chatTrees } from './process-tree';
import type { ResourceSource } from './proc-source';
import { procResourceSource } from './proc-source';

// A baseline older than this would average the CPU over the time nobody was looking (Settings closed).
const STALE_BASELINE_MS: number = 5000;
// With no fresh baseline one is taken first and the CPU measured over this window, so numbers show at once.
const WARM_UP_MS: number = 500;
// The desktop window and Orbit Web may both poll; a window shorter than this would be mostly noise.
const MIN_SAMPLE_INTERVAL_MS: number = 1000;

interface Reading {
  readonly takenAt: number;
  readonly samples: readonly ProcessSample[];
  readonly book: TickBook;
}

interface CachedSnapshot {
  readonly takenAt: number;
  readonly snapshot: ResourceSnapshot;
}

// Samples /proc only when asked. The last reading is kept, every process of the machine in it, so the next one can
// tell how much CPU each used meanwhile; replacing it whole drops the pids that died.
export class ResourceSampler {
  private previous: Reading | null = null;
  private cached: CachedSnapshot | null = null;
  private inFlight: Promise<ResourceSnapshot> | null = null;
  private readonly memory: MemoryBook;

  constructor(private readonly source: ResourceSource = procResourceSource) {
    this.memory = new MemoryBook((pids: readonly number[]): Promise<number[]> => source.memoryBytes(pids));
  }

  snapshot(): Promise<ResourceSnapshot> {
    if (this.cached !== null && this.source.monotonicMs() - this.cached.takenAt < MIN_SAMPLE_INTERVAL_MS) {
      return Promise.resolve(this.cached.snapshot);
    }
    this.inFlight ??= this.sample().finally((): void => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async sample(): Promise<ResourceSnapshot> {
    const previous: Reading = await this.freshBaseline();
    const current: Reading = await this.read();
    this.previous = current;
    const trees: ChatTree[] = chatTrees(await this.source.chatRoots(), current.samples);
    await this.memory.update(treeSamples(trees, current.book), current.takenAt);
    const chats: ChatResourceUsage[] = trees.map((tree: ChatTree) => this.measure(tree, current, previous));
    const snapshot: ResourceSnapshot = { coreCount: this.source.coreCount(), sampledAt: Date.now(), chats };
    this.cached = { takenAt: current.takenAt, snapshot };
    return snapshot;
  }

  private async freshBaseline(): Promise<Reading> {
    if (this.previous !== null && this.source.monotonicMs() - this.previous.takenAt <= STALE_BASELINE_MS) return this.previous;
    const baseline: Reading = await this.read();
    await this.source.wait(WARM_UP_MS);
    return baseline;
  }

  private async read(): Promise<Reading> {
    const takenAt: number = this.source.monotonicMs();
    const samples: ProcessSample[] = await this.source.processes();
    return { takenAt, samples, book: toTickBook(samples) };
  }

  private measure(tree: ChatTree, current: Reading, previous: Reading): ChatResourceUsage {
    const ticks: number = treeTicksSince(tree.pids, current.book, previous.book);
    return {
      sessionId: tree.root.sessionId,
      pid: tree.root.pid,
      cpuPercent: cpuPercent(ticks, current.takenAt - previous.takenAt),
      memoryBytes: this.memory.total(tree.pids),
      processCount: tree.pids.length,
    };
  }
}

function treeSamples(trees: readonly ChatTree[], book: TickBook): ProcessSample[] {
  return trees.flatMap((tree: ChatTree) => tree.pids.map((pid: number) => book.get(pid))).filter(
    (sample: ProcessSample | undefined): sample is ProcessSample => sample !== undefined,
  );
}
