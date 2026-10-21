import { describe, expect, it } from 'vitest';
import type { ResourceSnapshot } from '../src/shared/chat-resources';
import { formatCoreCount, formatCpuPercent, formatMemory, formatProcessCount } from '../src/renderer/views/resources-format';
import type { ChatIdentity, ResourceRow, ResourceTable } from '../src/renderer/views/resources-table';
import { buildResourceTable } from '../src/renderer/views/resources-table';

const MB: number = 1024 * 1024;

describe('resource formatting', () => {
  it('shows CPU compactly, with a decimal only for small values', () => {
    expect(formatCpuPercent(0)).toBe('0%');
    expect(formatCpuPercent(2.46)).toBe('2.5%');
    expect(formatCpuPercent(12.4)).toBe('12%');
    expect(formatCpuPercent(134.6)).toBe('135%');
  });

  it('shows memory in MB, and in GB with one decimal from a gigabyte up', () => {
    expect(formatMemory(410 * MB)).toBe('410 MB');
    expect(formatMemory(1536 * MB)).toBe('1.5 GB');
    expect(formatMemory(1000 * MB)).toBe('1.0 GB');
    expect(formatMemory(999 * MB)).toBe('999 MB');
  });

  it('names cores and processes in the singular and plural', () => {
    expect(formatCoreCount(6)).toBe('of 6 cores');
    expect(formatCoreCount(1)).toBe('of 1 core');
    expect(formatProcessCount(1)).toBe('1 process');
    expect(formatProcessCount(12)).toBe('12 processes');
  });
});

describe('buildResourceTable', () => {
  const snapshot: ResourceSnapshot = {
    coreCount: 6,
    sampledAt: 0,
    chats: [
      { sessionId: 'quiet', pid: 1, cpuPercent: 5, memoryBytes: 300 * MB, processCount: 3 },
      { sessionId: 'busy', pid: 2, cpuPercent: 15, memoryBytes: 100 * MB, processCount: 5 },
      { sessionId: 'closed-here', pid: 3, cpuPercent: 80, memoryBytes: 900 * MB, processCount: 9 },
    ],
  };
  const chats: ChatIdentity[] = [
    { sessionId: 'quiet', name: 'Quiet', color: 'green' },
    { sessionId: 'busy', name: 'Busy', color: null },
  ];
  const table: ResourceTable = buildResourceTable(snapshot, chats);

  it('lists the open chats busiest first, with their names and colors', () => {
    expect(table.rows.map((row: ResourceRow): [string, string | null] => [row.name, row.color])).toEqual([['Busy', null], ['Quiet', 'green']]);
  });

  it('totals the listed chats and gives each its share of the total', () => {
    expect(table.total).toEqual({ cpuPercent: 20, memoryBytes: 400 * MB, processCount: 8 });
    expect(table.rows[0]?.cpuShare).toBe(0.75);
    expect(table.rows[1]?.memoryShare).toBe(0.75);
    expect(table.coreCount).toBe(6);
  });

  it('gives no share when everything is idle', () => {
    const idle: ResourceTable = buildResourceTable({ ...snapshot, chats: [{ ...snapshot.chats[0]!, cpuPercent: 0 }] }, chats);
    expect(idle.rows[0]?.cpuShare).toBe(0);
  });
});
