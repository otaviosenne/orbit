// The night auto-shutdown (~/.config/hypr/scripts/auto-shutdown): between its start and end hours it powers the PC off
// once nobody uses it and no chat is working. Orbit only moves tonight's start later, up to the end (= not tonight).
export interface NightWindow {
  readonly startHour: number;
  readonly endHour: number;
}

export interface NightShutdownState {
  // Null when the auto-shutdown scripts are not installed on this machine.
  readonly window: NightWindow | null;
  // Its timer runs; when off, nothing powers the PC off at night.
  readonly isEnabled: boolean;
  // The hour tonight's shutdown may start from; the window's end means it stays on all night.
  readonly tonightStartHour: number;
}

const HOURS_PER_DAY: number = 24;

// The usual start, each whole hour after it, and the morning end, which skips tonight altogether.
export function startChoices(window: NightWindow): number[] {
  const span: number = (window.endHour - window.startHour + HOURS_PER_DAY) % HOURS_PER_DAY;
  return Array.from({ length: span + 1 }, (_: unknown, step: number) => (window.startHour + step) % HOURS_PER_DAY);
}

export function isStartChoice(hour: unknown, window: NightWindow): hour is number {
  return typeof hour === 'number' && startChoices(window).includes(hour);
}

// When tonight's shutdown may start if it starts at this hour; null for the usual start or an hour already past.
// Before the morning end the night began yesterday evening, so its later hours fall today.
export function holdUntilFor(hour: number, window: NightWindow, now: Date): number | null {
  if (hour === window.startHour) return null;
  const evening: Date = new Date(now);
  evening.setHours(window.startHour, 0, 0, 0);
  if (now.getHours() < window.endHour) evening.setDate(evening.getDate() - 1);
  const offset: number = (hour - window.startHour + HOURS_PER_DAY) % HOURS_PER_DAY;
  const at: Date = new Date(evening);
  at.setHours(window.startHour + offset, 0, 0, 0);
  return at.getTime() > now.getTime() ? at.getTime() : null;
}

// Which choice a saved hold stands for; a hold that ended (or none) means the usual start.
export function tonightStartHour(holdUntil: number | null, window: NightWindow, now: number): number {
  if (holdUntil === null || holdUntil <= now) return window.startHour;
  const hour: number = new Date(holdUntil).getHours();
  return startChoices(window).includes(hour) ? hour : window.startHour;
}

export function hoursText(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
