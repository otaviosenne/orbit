export const SECOND_MS: number = 1000;
export const MINUTE_MS: number = 60 * SECOND_MS;
export const HOUR_MS: number = 60 * MINUTE_MS;
export const DAY_MS: number = 24 * HOUR_MS;

// Every made-up time is measured from launch, so durations keep growing on screen like real ones do.
export const DEMO_EPOCH: number = Date.now();

export function minutesBeforeLaunch(minutes: number): number {
  return DEMO_EPOCH - minutes * MINUTE_MS;
}
