import { typingPath } from '../core/typing/typing-file';
import type { TypingRequest } from '../shared/typing-request';
import { MAX_TYPING_LABEL_LENGTH, parseTypingRequest } from '../shared/typing-request';
import { currentSessionId, saveRequestFile } from './request-file';
import type { ToolArgs, ToolResult } from './tool-result';
import { answer, problem } from './tool-result';

export const TYPING_TOOL_NAME: string = 'request_typing';

export const TYPING_TOOL = {
  name: TYPING_TOOL_NAME,
  title: 'Ask the user to type a secret on the PC',
  description:
    'Ask the user to type something you must never see, such as a password, into the browser field you focused on ' +
    'this PC. Orbit pins a bar above this chat with a password field; the user writes the text there (from the ' +
    'desktop or a phone) and Orbit types it straight into the focused field, so the text never reaches you. First ' +
    'click the field in the browser so it has the keyboard focus. Orbit types only into a browser window. After ' +
    'calling it, end your turn right away: the user\'s next message says whether it was typed (never the text).',
  inputSchema: {
    type: 'object',
    properties: {
      label: {
        type: 'string',
        maxLength: MAX_TYPING_LABEL_LENGTH,
        description: 'What to type and where, in the user\'s language, e.g. "Senha do modem (192.168.24.1)".',
      },
    },
    required: ['label'],
    additionalProperties: false,
  },
} as const;

const SHOWN: string =
  'Shown in Orbit above this chat. Keep the field focused and end your turn now without doing anything else; the ' +
  'user\'s next message says whether it was typed. Also say in one line, in your reply, that Orbit is waiting for ' +
  'the user to type it.';

export async function requestTyping(args: ToolArgs, chatPid: number, now: number = Date.now(), sessionId: string | null = currentSessionId()): Promise<ToolResult> {
  const request: TypingRequest | null = parseTypingRequest({ label: args['label'], requestedAt: now });
  if (request === null) return problem('Give a label saying what to type');
  await saveRequestFile(typingPath(chatPid), { ...request, sessionId });
  return answer(SHOWN);
}
