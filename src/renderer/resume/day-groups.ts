import type { PastChat } from '../../shared/types';
import { startOfDay } from './resume-filters';

export interface DayGroup {
  readonly label: string;
  readonly chats: readonly PastChat[];
}

const DAY_MS: number = 24 * 60 * 60 * 1000;

// Expects chats newest first; consecutive chats from the same calendar day share one header.
export function groupByDay(chats: readonly PastChat[], now: number): DayGroup[] {
  const groups: { label: string; chats: PastChat[] }[] = [];
  for (const chat of chats) {
    const label: string = dayLabel(chat.lastActivityAt, now);
    const last: { label: string; chats: PastChat[] } | undefined = groups[groups.length - 1];
    if (last !== undefined && last.label === label) last.chats.push(chat);
    else groups.push({ label, chats: [chat] });
  }
  return groups;
}

export function dayLabel(timestamp: number, now: number): string {
  const today: number = startOfDay(now);
  const day: number = startOfDay(timestamp);
  if (day === today) return 'Today';
  // Days are not always 24 h long (daylight saving), so compare against the previous day's own midnight.
  if (day === startOfDay(today - DAY_MS / 2)) return 'Yesterday';
  const sameYear: boolean = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return new Date(timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}
