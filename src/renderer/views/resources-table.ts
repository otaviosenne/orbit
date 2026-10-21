import type { ChatResourceUsage, ResourceSnapshot } from '../../shared/chat-resources';
import type { ChatSnapshot } from '../../shared/types';

// The renderer's own view of a chat, so a rename or recolor not yet confirmed shows here too.
export type ChatIdentity = Pick<ChatSnapshot, 'sessionId' | 'name' | 'color'>;

export interface ResourceRow {
  readonly sessionId: string;
  readonly name: string;
  readonly color: string | null;
  readonly cpuPercent: number;
  readonly memoryBytes: number;
  readonly processCount: number;
  // Of the total row, from 0 to 1, for the inline bars.
  readonly cpuShare: number;
  readonly memoryShare: number;
}

export interface ResourceTotal {
  readonly cpuPercent: number;
  readonly memoryBytes: number;
  readonly processCount: number;
}

export interface ResourceTable {
  readonly rows: readonly ResourceRow[];
  readonly total: ResourceTotal;
  readonly coreCount: number;
}

// Open chats only, busiest first; a chat measured but already closed here, or not yet listed, is left out.
export function buildResourceTable(snapshot: ResourceSnapshot, chats: readonly ChatIdentity[]): ResourceTable {
  const identities: Map<string, ChatIdentity> = new Map(chats.map((chat: ChatIdentity): [string, ChatIdentity] => [chat.sessionId, chat]));
  const measured: ChatResourceUsage[] = snapshot.chats.filter((usage: ChatResourceUsage) => identities.has(usage.sessionId));
  const total: ResourceTotal = sumUsage(measured);
  const rows: ResourceRow[] = measured.map((usage: ChatResourceUsage) => toRow(usage, identities.get(usage.sessionId) as ChatIdentity, total));
  rows.sort((a: ResourceRow, b: ResourceRow) => b.cpuPercent - a.cpuPercent || b.memoryBytes - a.memoryBytes);
  return { rows, total, coreCount: snapshot.coreCount };
}

function sumUsage(usages: readonly ChatResourceUsage[]): ResourceTotal {
  return usages.reduce(
    (total: ResourceTotal, usage: ChatResourceUsage): ResourceTotal => ({
      cpuPercent: total.cpuPercent + usage.cpuPercent,
      memoryBytes: total.memoryBytes + usage.memoryBytes,
      processCount: total.processCount + usage.processCount,
    }),
    { cpuPercent: 0, memoryBytes: 0, processCount: 0 },
  );
}

function toRow(usage: ChatResourceUsage, chat: ChatIdentity, total: ResourceTotal): ResourceRow {
  return {
    sessionId: usage.sessionId,
    name: chat.name,
    color: chat.color,
    cpuPercent: usage.cpuPercent,
    memoryBytes: usage.memoryBytes,
    processCount: usage.processCount,
    cpuShare: share(usage.cpuPercent, total.cpuPercent),
    memoryShare: share(usage.memoryBytes, total.memoryBytes),
  };
}

function share(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}
