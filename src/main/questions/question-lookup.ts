import type { ChatSnapshot, QuestionItem, QuestionState, TranscriptItem } from '../../shared/types';
import { hookedQuestion } from '../../core/questions/hooked-question';
import { delay } from '../run-command';
import { readHookedRecord } from './hooked-question-file';

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

// The newest question still waiting. Claude Code does not always write it to the transcript before the answer,
// so the copy the PreToolUse hook saved stands in for it then.
export async function pendingQuestion(source: QuestionSource, sessionId: string): Promise<QuestionItem | null> {
  const items: TranscriptItem[] = await source.transcript(sessionId);
  const written: QuestionItem | undefined = items.filter((item: TranscriptItem): item is QuestionItem => item.kind === 'question' && item.state === 'pending').at(-1);
  return written ?? hookedQuestion(await readHookedRecord(sessionId), items);
}

// Resolves with the state of the question that newly settled, or null when none did in time.
// matches narrows it to the question that was answered, since its id is not always known beforehand.
// acceptsLeavingWait: a chat that stopped waiting took the answer, for questions the transcript may never pair
// with their result (the hook's copy, when Claude Code writes the question out of order or not at all).
export async function waitForNewlySettled(
  source: QuestionSource,
  sessionId: string,
  known: ReadonlySet<string>,
  matches: (item: QuestionItem) => boolean = (): boolean => true,
  acceptsLeavingWait: boolean = false,
): Promise<QuestionState | null> {
  const deadline: number = Date.now() + ANSWER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const items: TranscriptItem[] = await source.transcript(sessionId);
    const settled: QuestionItem | undefined = items.filter(isSettledQuestion).find((item: QuestionItem) => !known.has(item.id) && matches(item));
    if (settled !== undefined) return settled.state;
    if (acceptsLeavingWait && !(await isWaiting(source, sessionId))) return 'answered';
    await delay(ANSWER_POLL_MS);
  }
  return null;
}

// True when the transcript holds this question as written by the chat, not only the hook's copy of it.
export async function isInTranscript(source: QuestionSource, sessionId: string, questionId: string): Promise<boolean> {
  return (await source.transcript(sessionId)).some((item: TranscriptItem) => item.id === questionId);
}

async function isWaiting(source: QuestionSource, sessionId: string): Promise<boolean> {
  return (await source.chats()).some((chat: ChatSnapshot) => chat.sessionId === sessionId && chat.status === 'waiting');
}

function isSettledQuestion(item: TranscriptItem): item is QuestionItem {
  return item.kind === 'question' && item.state !== 'pending';
}
