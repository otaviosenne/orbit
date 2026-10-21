import { describe, expect, it } from 'vitest';
import { cpuPercent, ticksSince, toTickBook, treeTicksSince } from '../src/core/resources/cpu-usage';
import type { TickBook } from '../src/core/resources/cpu-usage';
import type { ProcessSample } from '../src/core/resources/process-sample';

function sample(pid: number, cpuTicks: number, startTime: string = `t${pid}`): ProcessSample {
  return { pid, parentPid: 1, startTime, cpuTicks };
}

describe('ticksSince', () => {
  const previous: TickBook = toTickBook([sample(10, 500), sample(11, 90)]);

  it('is the difference for a process seen before', () => {
    expect(ticksSince(sample(10, 650), previous)).toBe(150);
  });

  it('counts every tick of a process born inside the window', () => {
    expect(ticksSince(sample(12, 40), previous)).toBe(40);
  });

  it('treats a reused pid as a new process', () => {
    expect(ticksSince(sample(11, 7, 'reused'), previous)).toBe(7);
  });

  it('never goes negative', () => {
    expect(ticksSince(sample(10, 400), previous)).toBe(0);
  });
});

describe('treeTicksSince', () => {
  it('sums per process, so a child that exited takes nothing away from the chat', () => {
    const previous: TickBook = toTickBook([sample(1, 100), sample(2, 900)]);
    const current: TickBook = toTickBook([sample(1, 130)]);
    expect(treeTicksSince([1, 2], current, previous)).toBe(30);
  });
});

describe('cpuPercent', () => {
  it('reads like top: 100 ticks a second is one full core', () => {
    expect(cpuPercent(200, 2000)).toBe(100);
    expect(cpuPercent(600, 2000)).toBe(300);
    expect(cpuPercent(5, 500)).toBe(10);
  });

  it('is zero for an empty window', () => {
    expect(cpuPercent(10, 0)).toBe(0);
  });
});
