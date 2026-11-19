import { typingPath } from '../core/typing/typing-file';
import type { TypingRequest } from '../shared/typing-request';
import { MAX_TYPING_FIELDS, MAX_TYPING_LABEL_LENGTH, MAX_TYPING_TITLE_LENGTH, MIN_TYPING_FIELDS, parseTypingRequest } from '../shared/typing-request';
import { currentSessionId, saveRequestFile } from './request-file';
import type { ToolArgs, ToolResult } from './tool-result';
import { answer, problem } from './tool-result';

export const TYPING_TOOL_NAME: string = 'request_typing';

export const TYPING_TOOL = {
  name: TYPING_TOOL_NAME,
  title: 'Ask the user for secrets through the PC clipboard',
  description:
    'Ask the user for things you must never see, such as a password, to put into fields on this PC (a browser ' +
    `sign-in, say). One request can hold ${MIN_TYPING_FIELDS} to ${MAX_TYPING_FIELDS} fields (e.g. e-mail + password ` +
    '+ security word, or password + confirm password). Orbit pins a bar above this chat with one text input and one ' +
    'Copy button per field; the user fills a field (from the desktop or a phone) and copies it, and Orbit puts that ' +
    'value on the PC\'s clipboard, kept out of the clipboard history and wiped after a short while, so the text never ' +
    'reaches you. Each copy arrives as the user\'s next message, naming the field (never the value): then give the ' +
    'target window real keyboard focus on the PC (hyprctl dispatch focuswindow; Orbit may hold it), click that field, ' +
    'press ctrl+v to paste it, and end your turn to wait for the next "Copied" message until every field is done; the ' +
    'last one says so. The user may also decline. After calling it, end your turn right away.',
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
        description: 'The fields the user copies, in the order the page asks for them.',
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
  'Shown in Orbit above this chat. End your turn now without doing anything else; the user\'s next message says ' +
  'which field is on the clipboard for you to paste with ctrl+v, or that the user declined. Also say in one line, in ' +
  'your reply, that Orbit is waiting for the user to copy it.';

const NO_FIELDS: string = `Give ${MIN_TYPING_FIELDS} to ${MAX_TYPING_FIELDS} fields, each with a label saying what goes in it`;

export async function requestTyping(args: ToolArgs, chatPid: number, now: number = Date.now(), sessionId: string | null = currentSessionId()): Promise<ToolResult> {
  // Only "fields" counts here: the one-label shape is read back only from files an older server wrote.
  if (!Array.isArray(args['fields'])) return problem(NO_FIELDS);
  const request: TypingRequest | null = parseTypingRequest({ title: args['title'], fields: args['fields'], requestedAt: now });
  if (request === null) return problem(NO_FIELDS);
  await saveRequestFile(typingPath(chatPid), { ...request, sessionId });
  return answer(SHOWN);
}
