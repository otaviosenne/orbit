import type { ChatSnapshot, QuestionItem, QuestionState, TranscriptItem } from '../../shared/types';
import { delay } from '../run-command';

// How long the chat gets to write the answer into its transcript after the keys went in.
const ANSWER_TIMEOUT_MS: number = 15_000;
const ANSWER_POLL_MS: number = 300;

export const ANSWER_TIMEOUT_SECONDS: number = ANSWER_TIMEOUT_MS / 1000;

// What answering needs from the radar: the open chats and their transcripts.
export interface QuestionSource {
  chats(): Promise<ChatSnapshot[]>;
  transcript(sessionId: string): Promise<TranscriptItem[]>;
}

// A waiting question is not in the transcript yet; it shows up there, settled, once the chat took the answer.
export async function settledQuestionIds(source: QuestionSource, sessionId: string): Promise<Set<string>> {
  const items: TranscriptItem[] = await source.transcript(sessionId);
  return new Set(items.filter(isSettledQuestion).map((item: QuestionItem) => item.id));
}

// Resolves with the state of the question that newly settled, or null when none did in time.
export async function waitForNewlySettled(source: QuestionSource, sessionId: string, known: ReadonlySet<string>): Promise<QuestionState | null> {
  const deadline: number = Date.now() + ANSWER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const items: TranscriptItem[] = await source.transcript(sessionId);
    const settled: QuestionItem | undefined = items.filter(isSettledQuestion).find((item: QuestionItem) => !known.has(item.id));
    if (settled !== undefined) return settled.state;
    await delay(ANSWER_POLL_MS);
  }
  return null;
}

function isSettledQuestion(item: TranscriptItem): item is QuestionItem {
  return item.kind === 'question' && item.state !== 'pending';
}
