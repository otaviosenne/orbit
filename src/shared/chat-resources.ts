// One open chat's load on the machine: its claude process plus every process under it (background shells, MCP
// servers, dev servers...), never the terminal window around it.
export interface ChatResourceUsage {
  readonly sessionId: string;
  readonly pid: number;
  // Counted like top: 100 is one core kept fully busy, so a chat can pass 100 on a multi-core machine.
  readonly cpuPercent: number;
  // Summed PSS: pages shared between processes are split among them, so the chats' memory adds up honestly.
  // Re-read less often than the CPU (see MemoryBook), since it is costly to read and moves slowly.
  readonly memoryBytes: number;
  readonly processCount: number;
}

export interface ResourceSnapshot {
  // The cores of the machine running the chats, which is not the device Orbit Web is viewed on.
  readonly coreCount: number;
  readonly sampledAt: number;
  readonly chats: readonly ChatResourceUsage[];
}
