import type { ChatSnapshot, TranscriptItem, TurnProgress } from '../../shared/types';
import type { ChatSheet } from './chat-sheet';
import type { PageFetch } from './paging/paged-transcript';

// Polls whichever thread the panel shows (the chat's or one agent's) and its working line.
export async function loadThread(sheet: ChatSheet, chat: ChatSnapshot): Promise<void> {
  const agentId: string | null = sheet.agentId;
  await sheet.loadTranscript(chat.sessionId, agentId, threadPages(chat.sessionId, agentId));
  const progress: TurnProgress | null = chat.status === 'busy' ? await window.radar.getTurnProgress(chat.sessionId) : null;
  sheet.showProgress(chat, progress);
}

function threadPages(sessionId: string, agentId: string | null): PageFetch {
  if (agentId === null) return (limit: number): Promise<TranscriptItem[]> => window.radar.getTranscript(sessionId, limit);
  return (limit: number): Promise<TranscriptItem[]> => window.radar.getAgentTranscript(sessionId, agentId, limit);
}
