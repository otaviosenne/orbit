import type { TimeWindow } from '../timeline-layout';
import { toPercent } from '../timeline-layout';
import type { CountStep } from './agent-count-series';

// The SVG's coordinate box: x runs 0–100 like the bar view's percentages, y is the track's height in pixels.
export interface SparkScale {
  readonly window: TimeWindow;
  // The count that reaches the top; shared by every lane so equal heights mean equal counts.
  readonly peak: number;
  readonly height: number;
  // Keeps the stroke from being clipped at the very top and bottom.
  readonly inset: number;
}

const COORDINATE_DECIMALS: number = 2;

// A step line: flat while the count holds, straight up or down where it changes.
export function sparkLinePath(steps: readonly CountStep[], scale: SparkScale): string {
  const first: CountStep | undefined = steps[0];
  if (first === undefined) return '';
  const commands: string[] = [`M${x(first.start, scale)} ${y(first.agents.length, scale)}`];
  steps.forEach((step: CountStep, index: number): void => {
    commands.push(`H${x(step.end, scale)}`);
    const next: CountStep | undefined = steps[index + 1];
    if (next !== undefined && next.agents.length !== step.agents.length) commands.push(`V${y(next.agents.length, scale)}`);
  });
  return commands.join(' ');
}

// The same line closed down to the baseline, for the soft fill under it.
export function sparkAreaPath(steps: readonly CountStep[], scale: SparkScale): string {
  const first: CountStep | undefined = steps[0];
  const line: string = sparkLinePath(steps, scale);
  if (first === undefined) return '';
  return `${line} V${y(0, scale)} H${x(first.start, scale)} Z`;
}

function x(time: number, scale: SparkScale): string {
  return toPercent(time, scale.window).toFixed(COORDINATE_DECIMALS);
}

function y(count: number, scale: SparkScale): string {
  const usable: number = scale.height - 2 * scale.inset;
  const share: number = scale.peak > 0 ? count / scale.peak : 0;
  return (scale.height - scale.inset - share * usable).toFixed(COORDINATE_DECIMALS);
}
