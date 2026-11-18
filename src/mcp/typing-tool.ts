import { typingPath } from '../core/typing/typing-file';
import type { TypingRequest } from '../shared/typing-request';
import { MAX_TYPING_FIELDS, MAX_TYPING_LABEL_LENGTH, MAX_TYPING_TITLE_LENGTH, MIN_TYPING_FIELDS, parseTypingRequest } from '../shared/typing-request';
import { currentSessionId, saveRequestFile } from './request-file';
import type { ToolArgs, ToolResult } from './tool-result';
import { answer, problem } from './tool-result';

export const TYPING_TOOL_NAME: string = 'request_typing';

export const TYPING_TOOL = {
  name: TYPING_TOOL_NAME,
  title: 'Ask the user to type secrets on the PC',
  description:
    'Ask the user to type things you must never see, such as a password, into browser fields on this PC. One ' +
    `request can hold ${MIN_TYPING_FIELDS} to ${MAX_TYPING_FIELDS} fields (e.g. e-mail + password + security word, ` +
    'or password + confirm password). Orbit pins a bar above this chat with one text input per field; the user ' +
    'fills them (from the desktop or a phone) and Orbit types the values straight into the browser, in order, ' +
    'pressing Tab between them, so the text never reaches you. First click the FIRST field in the browser so it has ' +
    'the keyboard focus; the fields must follow each other in the page\'s Tab order, in the order you list them. ' +
    'Orbit presses Enter after the last one only if the user asks for it. Orbit types only into a browser window. ' +
    'After calling it, end your turn right away: the user\'s next message lists which fields were typed (never the ' +
    'values) or says the user declined.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        maxLength: MAX_TYPING_TITLE_LENGTH,
        description: 'Optional short purpose, in the user\'s language, e.g. "Login do modem (192.168.24.1)".',
      },
      fields: {
        type: 'array',
        minItems: MIN_TYPING_FIELDS,
        maxItems: MAX_TYPING_FIELDS,
        description: 'The fields to type, in the page\'s Tab order starting at the focused one.',
        items: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              maxLength: MAX_TYPING_LABEL_LENGTH,
              description: 'What goes in this field, in the user\'s language, e.g. "Senha do modem".',
            },
          },
          required: ['label'],
          additionalProperties: false,
        },
      },
    },
    required: ['fields'],
    additionalProperties: false,
  },
} as const;

const SHOWN: string =
  'Shown in Orbit above this chat. Keep the first field focused and end your turn now without doing anything else; ' +
  'the user\'s next message says whether it was typed. Also say in one line, in your reply, that Orbit is waiting ' +
  'for the user to type it.';

const NO_FIELDS: string = `Give ${MIN_TYPING_FIELDS} to ${MAX_TYPING_FIELDS} fields, each with a label saying what to type`;

export async function requestTyping(args: ToolArgs, chatPid: number, now: number = Date.now(), sessionId: string | null = currentSessionId()): Promise<ToolResult> {
  // Only "fields" counts here: the one-label shape is read back only from files an older server wrote.
  if (!Array.isArray(args['fields'])) return problem(NO_FIELDS);
  const request: TypingRequest | null = parseTypingRequest({ title: args['title'], fields: args['fields'], requestedAt: now });
  if (request === null) return problem(NO_FIELDS);
  await saveRequestFile(typingPath(chatPid), { ...request, sessionId });
  return answer(SHOWN);
}
