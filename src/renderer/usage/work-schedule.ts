// Pace is measured in working time: Monday to Friday, eight hours a day. Weekends and nights take no room on the chart.
export const WORK_START_HOUR: number = 9;
export const WORK_END_HOUR: number = 17;
const WORK_WEEKDAYS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5]);

// A stretch of working time inside the weekly window; `offset` is the working time that came before it.
export interface WorkSegment {
  readonly start: number;
  readonly end: number;
  readonly offset: number;
}

export function workSegments(windowStart: number, windowEnd: number): WorkSegment[] {
  const segments: WorkSegment[] = [];
  let offset: number = 0;
  const day: Date = new Date(windowStart);
  day.setHours(0, 0, 0, 0);
  while (day.getTime() < windowEnd) {
    const start: number = Math.max(atHour(day, WORK_START_HOUR), windowStart);
    const end: number = Math.min(atHour(day, WORK_END_HOUR), windowEnd);
    if (WORK_WEEKDAYS.has(day.getDay()) && end > start) {
      segments.push({ start, end, offset });
      offset += end - start;
    }
    day.setDate(day.getDate() + 1);
  }
  return segments;
}

export function totalWorkMs(segments: readonly WorkSegment[]): number {
  const last: WorkSegment | undefined = segments[segments.length - 1];
  return last === undefined ? 0 : last.offset + (last.end - last.start);
}

// How much working time had passed at this moment. Outside working hours the moment counts as the closest edge
// of working time, so a Sunday prompt lands at the start of Monday and a Friday-night one at the end of Friday.
export function workElapsed(segments: readonly WorkSegment[], at: number): number {
  for (let index = 0; index < segments.length; index += 1) {
    const segment: WorkSegment = segments[index];
    if (at <= segment.end && at >= segment.start) return segment.offset + (at - segment.start);
    if (at < segment.start) return nearestEdge(segments[index - 1], segment, at);
  }
  return totalWorkMs(segments);
}

function nearestEdge(previous: WorkSegment | undefined, next: WorkSegment, at: number): number {
  if (previous === undefined) return next.offset;
  const previousEdge: number = previous.offset + (previous.end - previous.start);
  return at - previous.end <= next.start - at ? previousEdge : next.offset;
}

function atHour(day: Date, hour: number): number {
  const moment: Date = new Date(day);
  moment.setHours(hour, 0, 0, 0);
  return moment.getTime();
}
