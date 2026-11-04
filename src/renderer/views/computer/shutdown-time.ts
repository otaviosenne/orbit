const MINUTES_PER_HOUR: number = 60;
const TIME_PATTERN: RegExp = /^(\d{1,2}):(\d{2})$/;

// The next time the clock shows "HH:MM": today if that is still ahead, else tomorrow. Null for a malformed time.
export function nextOccurrence(time: string, now: Date): number | null {
  const match: RegExpExecArray | null = TIME_PATTERN.exec(time);
  if (match === null) return null;
  const moment: Date = new Date(now);
  moment.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (moment.getTime() <= now.getTime()) moment.setDate(moment.getDate() + 1);
  return moment.getTime();
}

// An hour from now on the hour, as the time field's first suggestion.
export function suggestedTime(now: Date): string {
  const hour: number = (now.getHours() + 1 + (now.getMinutes() > 0 ? 1 : 0)) % 24;
  return `${String(hour).padStart(2, '0')}:00`;
}

export function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// "0:42" for the last minute.
export function countdownText(ms: number): string {
  const seconds: number = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / MINUTES_PER_HOUR)}:${String(seconds % MINUTES_PER_HOUR).padStart(2, '0')}`;
}
