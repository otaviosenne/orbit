import { askPath } from '../core/asks/ask-file';
import type { AskRequest } from '../shared/ask';
import { MAX_ASK_OPTIONS, MAX_DESCRIPTION_LENGTH, MAX_LABEL_LENGTH, MAX_QUESTION_LENGTH, MIN_ASK_OPTIONS, parseAsk } from '../shared/ask';
import { currentSessionId, saveRequestFile } from './request-file';
import type { ToolArgs, ToolResult } from './tool-result';
import { answer, problem } from './tool-result';

export const ASK_TOOL_NAME: string = 'ask_user';

export const ASK_TOOL = {
  name: ASK_TOOL_NAME,
  title: 'Ask the user a question in Orbit',
  description:
    'Ask the user anything they must decide or allow: a choice between options (A or B, A to D), a yes-or-no ' +
    'permission, which way to go next. Orbit pins the question above this chat, with one button per option, until ' +
    'it is answered, so it is never lost in a long reply. Use this instead of asking in your reply text and instead ' +
    'of AskUserQuestion. Not for pushing to main or cutting a release: that is request_approval. Give 2 to 4 short ' +
    'options; the user can also answer in the chat instead. After calling it, end your turn right away and do ' +
    'nothing else: the answer arrives as the user\'s next message.',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        maxLength: MAX_QUESTION_LENGTH,
        description: 'The question, in one sentence (two at most), in the language the user writes to you.',
      },
      options: {
        type: 'array',
        minItems: MIN_ASK_OPTIONS,
        maxItems: MAX_ASK_OPTIONS,
        description: 'The answers to pick from, recommended one first. For a permission: Yes / No.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', maxLength: MAX_LABEL_LENGTH, description: 'The button text, a few words.' },
            description: { type: 'string', maxLength: MAX_DESCRIPTION_LENGTH, description: 'Optional: what picking it means, one short line.' },
          },
          required: ['label'],
          additionalProperties: false,
        },
      },
    },
    required: ['question', 'options'],
    additionalProperties: false,
  },
} as const;

const SHOWN: string =
  'Shown in Orbit above this chat. End your turn now without doing anything else; the user\'s answer arrives as ' +
  'their next message. Also say in one line, in your reply, that the question is waiting in Orbit.';

const INVALID: string = `Give a question and ${MIN_ASK_OPTIONS} to ${MAX_ASK_OPTIONS} options, each with a non-empty label`;

// The chat is the process that started this server: Claude Code runs it directly, with no shell in between.
export async function askUser(args: ToolArgs, chatPid: number, now: number = Date.now(), sessionId: string | null = currentSessionId()): Promise<ToolResult> {
  const request: AskRequest | null = parseAsk({ question: args['question'], options: args['options'], requestedAt: now });
  if (request === null) return problem(INVALID);
  await saveRequestFile(askPath(chatPid), { ...request, sessionId });
  return answer(SHOWN);
}
