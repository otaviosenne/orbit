import type { PacePoint } from './pace-model';
import { totalWorkMs, workElapsed, type WorkSegment } from './work-schedule';

const FULL_PERCENT: number = 100;

// The even pace spreads the week over working hours alone, whatever the x axis spans: it climbs through working
// hours and stays flat through nights, weekends and hours of use outside work. Where the axis skips time (the hours
// nobody used), the working time skipped shows as a step up.
export function evenPaceLine(axis: readonly WorkSegment[], work: readonly WorkSegment[]): PacePoint[] {
  const axisTotal: number = totalWorkMs(axis);
  const workTotal: number = totalWorkMs(work);
  if (axisTotal === 0 || workTotal === 0) return [];
  const percentAt = (at: number): number => (workElapsed(work, at) / workTotal) * FULL_PERCENT;
  return axis.flatMap((segment: WorkSegment): PacePoint[] =>
    bendsOf(segment, work).map((at: number): PacePoint => ({ x: (segment.offset + at - segment.start) / axisTotal, percent: percentAt(at) })),
  );
}

// The segment's edges and every working-hours edge inside it, where the line changes slope.
function bendsOf(segment: WorkSegment, work: readonly WorkSegment[]): number[] {
  const inside: number[] = work
    .flatMap((stretch: WorkSegment): number[] => [stretch.start, stretch.end])
    .filter((at: number) => at > segment.start && at < segment.end);
  return [segment.start, ...inside, segment.end];
}
