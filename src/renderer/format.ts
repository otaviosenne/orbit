const SECOND_MS: number = 1000;
const MINUTE_MS: number = 60 * SECOND_MS;
const HOUR_MS: number = 60 * MINUTE_MS;
const DAY_MS: number = 24 * HOUR_MS;
const PAD_WIDTH: number = 2;

export function formatDuration(ms: number): string {
  const safe: number = Math.max(0, ms);
  if (safe < MINUTE_MS) return `${Math.floor(safe / SECOND_MS)}s`;
  if (safe < HOUR_MS) return `${Math.floor(safe / MINUTE_MS)}m`;
  if (safe < DAY_MS) return `${Math.floor(safe / HOUR_MS)}h ${pad(Math.floor((safe % HOUR_MS) / MINUTE_MS))}m`;
  return `${Math.floor(safe / DAY_MS)}d ${Math.floor((safe % DAY_MS) / HOUR_MS)}h`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Close resets read as a countdown; distant ones as a weekday and time.
export function formatReset(resetsAt: number, now: number): string {
  if (resetsAt - now < DAY_MS) return `Resets in ${formatDuration(resetsAt - now)}`;
  const weekday: string = new Date(resetsAt).toLocaleDateString([], { weekday: 'short' });
  return `Resets ${weekday} ${formatClock(resetsAt)}`;
}

function pad(value: number): string {
  return String(value).padStart(PAD_WIDTH, '0');
}
