import { describe, expect, it } from 'vitest';
import type { CountStep } from '../src/renderer/views/timeline-lines/agent-count-series';
import type { SparkScale } from '../src/renderer/views/timeline-lines/sparkline-path';
import { sparkAreaPath, sparkLinePath } from '../src/renderer/views/timeline-lines/sparkline-path';
import type { AgentSnapshot } from '../src/shared/types';

const SCALE: SparkScale = { window: { start: 0, end: 100 }, peak: 2, height: 40, inset: 0 };

function step(start: number, end: number, count: number): CountStep {
  return { start, end, agents: Array.from({ length: count }, (): AgentSnapshot => ({}) as AgentSnapshot) };
}

describe('sparkline paths', () => {
  it('draws a step line that only turns where the count changes', () => {
    const steps: CountStep[] = [step(0, 20, 0), step(20, 50, 2), step(50, 70, 2), step(70, 100, 1)];
    expect(sparkLinePath(steps, SCALE)).toBe('M0.00 40.00 H20.00 V0.00 H50.00 H70.00 V20.00 H100.00');
  });

  it('closes the area down to the baseline', () => {
    expect(sparkAreaPath([step(0, 100, 1)], SCALE)).toBe('M0.00 20.00 H100.00 V40.00 H0.00 Z');
  });

  it('draws nothing without steps', () => {
    expect(sparkLinePath([], SCALE)).toBe('');
    expect(sparkAreaPath([], SCALE)).toBe('');
  });
});
