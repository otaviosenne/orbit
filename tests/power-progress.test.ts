import { describe, expect, it } from 'vitest';
import { PowerProgress } from '../src/web/power/power-progress';

const SECOND: number = 1_000;

describe('PowerProgress for a shutdown', () => {
  it('stays below a third while Orbit still answers', () => {
    const progress: PowerProgress = new PowerProgress('shutdown', 0);
    progress.observe('online', 10 * SECOND);
    expect(progress.percent(10 * SECOND)).toBeLessThan(30);
    expect(progress.phase(10 * SECOND)).toBe('closing');
  });

  it('fills as the machine powers off and finishes once it is surely off', () => {
    const progress: PowerProgress = new PowerProgress('shutdown', 0);
    progress.observe('off', 2 * SECOND);
    expect(progress.phase(9 * SECOND)).toBe('powering-off');
    expect(progress.percent(9 * SECOND)).toBeGreaterThan(30);
    expect(progress.percent(17 * SECOND)).toBe(100);
    expect(progress.phase(17 * SECOND)).toBe('off');
  });

  it('never goes back', () => {
    const progress: PowerProgress = new PowerProgress('shutdown', 0);
    const before: number = progress.percent(20 * SECOND);
    expect(progress.percent(SECOND)).toBe(before);
  });

  it('ignores an offline phone, and gives up on a PC that keeps answering', () => {
    const progress: PowerProgress = new PowerProgress('shutdown', 0);
    progress.observe('unknown', SECOND);
    expect(progress.phase(30 * SECOND)).toBe('closing');
    expect(progress.phase(100 * SECOND)).toBe('stuck');
  });
});

describe('PowerProgress for a restart', () => {
  it('counts Orbit back only after the tunnel went dark', () => {
    const progress: PowerProgress = new PowerProgress('restart', 0);
    progress.observe('starting', SECOND);
    expect(progress.phase(SECOND)).toBe('booting');
    progress.observe('off', 3 * SECOND);
    progress.observe('starting', 50 * SECOND);
    expect(progress.phase(50 * SECOND)).toBe('opening');
    expect(progress.percent(50 * SECOND)).toBeGreaterThanOrEqual(80);
    progress.observe('online', 56 * SECOND);
    expect(progress.percent(56 * SECOND)).toBe(100);
    expect(progress.phase(56 * SECOND)).toBe('back');
  });

  it('stays short of the end while the PC is dark', () => {
    const progress: PowerProgress = new PowerProgress('restart', 0);
    progress.observe('off', SECOND);
    expect(progress.percent(200 * SECOND)).toBeLessThan(80);
  });
});
