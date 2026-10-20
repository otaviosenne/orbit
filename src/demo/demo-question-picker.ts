import type { QuestionPicker } from '../shared/types';
import { findDemoChat } from './demo-chats';

// Waiting chats are asked for their picker; this one shows a question, the others a permission prompt.
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

export function demoQuestionPicker(sessionId: unknown): QuestionPicker | null {
  return findDemoChat(sessionId)?.name === ASKING_CHAT_NAME ? RETRY_QUESTION : null;
}
