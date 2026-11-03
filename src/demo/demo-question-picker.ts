import type { QuestionPicker } from '../shared/types';
import { findDemoChat } from './demo-chats';

// Waiting chats are asked for their picker; this one shows a question, the other waiting ones a permission prompt.
const ASKING_CHAT_NAME: string = 'Stripe webhooks';

const RETRY_QUESTION: QuestionPicker = {
  kind: 'question',
  fingerprint: 'demo-retry-policy',
  tabs: [{ header: 'Retries', answered: false }],
  current: 0,
  question: 'How should failed webhook deliveries be retried?',
  multiSelect: false,
  options: [
    { label: 'Exponential backoff', description: '5 attempts over 24 hours, then alert', ticked: false },
    { label: 'Fixed interval', description: 'Every 10 minutes for 2 hours', ticked: false },
    { label: 'No retries', description: 'Log the failure and move on', ticked: false },
  ],
  other: null,
  hasReview: false,
};

const CLEANUP_PERMISSION: QuestionPicker = {
  kind: 'permission',
  fingerprint: 'demo-cleanup-permission',
  title: 'Bash command · from the general-purpose agent',
  description: 'Remove the recorded test videos',
  detail: 'source ./scripts/env.sh; rm -rf $OUT/*.mp4 $OUT/.cache',
  warnings: ['Dangerous rm operation on possibly-empty variable path: $OUT/*.mp4 (rewrite it as "${OUT:?}"/*.mp4 or use a literal path)'],
  question: 'Do you want to proceed?',
  options: [{ number: 1, label: 'Yes' }, { number: 2, label: 'No' }],
};

export function demoQuestionPicker(sessionId: unknown): QuestionPicker | null {
  const chat: { readonly name: string; readonly status: string } | undefined = findDemoChat(sessionId);
  if (chat?.name === ASKING_CHAT_NAME) return RETRY_QUESTION;
  return chat?.status === 'waiting' ? CLEANUP_PERMISSION : null;
}
