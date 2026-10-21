import type { Route } from '../../shared/ipc-routing';
import type { ActionResult } from '../../shared/types';
import { stopAgent } from '../agent-stop/agent-stopper';
import { interruptShell } from '../shell-stop/shell-interrupter';
import { recolorChat, renameChat, sendMessage } from '../chat-actions';
import { interruptChat } from '../chat-interrupt';
import { resumeChat } from '../chat-resumer';
import { openLauncher } from '../launcher';
import { answerQuestion, submitAnswers } from '../questions/question-answerer';
import { answerQuestionSet } from '../questions/set-answerer';
import { failure } from '../terminal-input';
import { isAttachmentList, isPid, textArg } from './route-args';
import type { RouteServices } from './route-services';

type ActionChannel =
  | 'OpenLauncher'
  | 'ResumeChat'
  | 'RenameChat'
  | 'RecolorChat'
  | 'SendMessage'
  | 'InterruptChat'
  | 'AnswerQuestion'
  | 'SubmitAnswers'
  | 'AnswerQuestionSet'
  | 'StopAgent'
  | 'InterruptShell';

const NOT_A_CHAT: ActionResult = failure('Not a chat');
const NOT_IMAGES: ActionResult = failure('Attachments must be images');

export function actionRoutes({ radar, pastChats }: RouteServices): Readonly<Record<ActionChannel, Route>> {
  return {
    OpenLauncher: (name: unknown): Promise<ActionResult> => openLauncher(textArg(name)),
    ResumeChat: (sessionId: unknown): Promise<ActionResult> => resumeChat(pastChats, sessionId),
    RenameChat: (pid: unknown, name: unknown): Promise<ActionResult> => onChat(pid, (chat: number) => renameChat(chat, textArg(name))),
    RecolorChat: (pid: unknown, color: unknown): Promise<ActionResult> => onChat(pid, (chat: number) => recolorChat(chat, textArg(color))),
    SendMessage: (pid: unknown, text: unknown, uploads: unknown): Promise<ActionResult> =>
      onChat(pid, (chat: number) => (isAttachmentList(uploads) ? sendMessage(chat, textArg(text), uploads) : Promise.resolve(NOT_IMAGES))),
    InterruptChat: (pid: unknown): Promise<ActionResult> => onChat(pid, interruptChat),
    AnswerQuestion: (sessionId: unknown, fingerprint: unknown, answer: unknown): Promise<ActionResult> =>
      answerQuestion(radar, sessionId, fingerprint, answer),
    SubmitAnswers: (sessionId: unknown, fingerprint: unknown): Promise<ActionResult> => submitAnswers(radar, sessionId, fingerprint),
    AnswerQuestionSet: (sessionId: unknown, questionId: unknown, answers: unknown): Promise<ActionResult> =>
      answerQuestionSet(radar, sessionId, questionId, answers),
    StopAgent: (sessionId: unknown, agentId: unknown): Promise<ActionResult> => stopAgent(radar, sessionId, agentId),
    InterruptShell: (sessionId: unknown, taskId: unknown): Promise<ActionResult> => interruptShell(radar, sessionId, taskId),
  };
}

function onChat(pid: unknown, action: (pid: number) => Promise<ActionResult>): Promise<ActionResult> {
  return isPid(pid) ? action(pid) : Promise.resolve(NOT_A_CHAT);
}
