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

// The newest question still waiting in the transcript (Claude Code does not always write it before the answer).
export async function pendingQuestion(source: QuestionSource, sessionId: string): Promise<QuestionItem | null> {
  const items: TranscriptItem[] = await source.transcript(sessionId);
  return items.filter((item: TranscriptItem): item is QuestionItem => item.kind === 'question' && item.state === 'pending').at(-1) ?? null;
}

// Resolves with the state of the question that newly settled, or null when none did in time.
// matches narrows it to the question that was answered, since its id is not always known beforehand.
export async function waitForNewlySettled(
  source: QuestionSource,
  sessionId: string,
  known: ReadonlySet<string>,
  matches: (item: QuestionItem) => boolean = (): boolean => true,
): Promise<QuestionState | null> {
  const deadline: number = Date.now() + ANSWER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const items: TranscriptItem[] = await source.transcript(sessionId);
    const settled: QuestionItem | undefined = items.filter(isSettledQuestion).find((item: QuestionItem) => !known.has(item.id) && matches(item));
    if (settled !== undefined) return settled.state;
    await delay(ANSWER_POLL_MS);
  }
  return null;
}

function isSettledQuestion(item: TranscriptItem): item is QuestionItem {
  return item.kind === 'question' && item.state !== 'pending';
}
