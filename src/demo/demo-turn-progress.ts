import type { ChatSnapshot, TurnProgress } from '../shared/types';
import { SECOND_MS } from './demo-clock';

// Roughly how fast Claude writes, so the token count climbs at a believable pace.
const TOKENS_PER_SECOND: number = 9;

export function demoTurnProgress(chat: ChatSnapshot | undefined, now: number): TurnProgress | null {
  if (chat === undefined || chat.status !== 'busy') return null;
  const elapsedSeconds: number = Math.max(0, (now - chat.statusSince) / SECOND_MS);
  return { startedAt: chat.statusSince, outputTokens: Math.round(elapsedSeconds * TOKENS_PER_SECOND) };
}
