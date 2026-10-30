import type { Route } from '../../shared/ipc-routing';
import type { ActionResult, PauseReport } from '../../shared/types';
import { stopAgent } from '../agent-stop/agent-stopper';
import { interruptShell } from '../shell-stop/shell-interrupter';
import { recolorChat, renameChat, sendMessage } from '../chat-actions';
import { interruptChat } from '../chat-interrupt';
import { continueChats, pauseChats } from '../chat-pause';
import { resumeChat } from '../chat-resumer';
import { openSignIn } from '../open-sign-in';
import { openLauncher } from '../launcher';
import { answerQuestion, submitAnswers } from '../questions/question-answerer';
import { answerQuestionSet } from '../questions/set-answerer';
import { declineQuestion } from '../questions/question-decliner';
import { failure } from '../terminal-input';
import { closeChat } from '../chat-closer';
import { answerApproval } from '../approvals/approval-answerer';
import { isApprovalAnswer } from '../../shared/approval';
import { focusTerminalOf } from '../terminal-focus';
import { isSessionId } from '../../shared/session-id';
import { isAttachmentList, isPauseTargets, isPid, isPidList, textArg } from './route-args';
import type { RouteServices } from './route-services';

type ActionChannel =
  | 'OpenLauncher'
  | 'ResumeChat'
  | 'OpenSignIn'
  | 'RenameChat'
  | 'RecolorChat'
  | 'SendMessage'
  | 'InterruptChat'
  | 'PauseChats'
  | 'ContinueChats'
  | 'AnswerQuestion'
  | 'SubmitAnswers'
  | 'AnswerQuestionSet'
  | 'DeclineQuestion'
  | 'StopAgent'
  | 'InterruptShell'
  | 'SetBoardState'
  | 'CloseChat'
  | 'AnswerApproval'
  | 'FocusChat'
  | 'OpenChatWindow';

const NOT_A_CHAT: ActionResult = failure('Not a chat');
const NOTHING_REACHED: PauseReport = { reached: [], skipped: [] };
const NOT_IMAGES: ActionResult = failure('Attachments must be images');
const NOT_AN_ANSWER: ActionResult = failure('Unknown answer');

export function actionRoutes({ radar, pastChats, boardState, chatWindows }: RouteServices): Readonly<Record<ActionChannel, Route>> {
  return {
    OpenLauncher: (name: unknown): Promise<ActionResult> => openLauncher(textArg(name)),
    OpenSignIn: (): Promise<ActionResult> => openSignIn(),
    SetBoardState: (key: unknown, value: unknown): Promise<ActionResult> => boardState.set(key, value),
    CloseChat: (pid: unknown): Promise<ActionResult> => (isPid(pid) ? closeChat(pid) : Promise.resolve(NOT_A_CHAT)),
    AnswerApproval: (pid: unknown, answer: unknown): Promise<ActionResult> =>
      onChat(pid, (chat: number) => (isApprovalAnswer(answer) ? answerApproval(chat, answer) : Promise.resolve(NOT_AN_ANSWER))),
    FocusChat: (pid: unknown): Promise<void> => (isPid(pid) ? focusTerminalOf(pid) : Promise.resolve()),
    // The id ends up in a file URL, so anything but a real id is ignored.
    OpenChatWindow: (sessionId: unknown): void => {
      if (isSessionId(sessionId)) chatWindows.open(sessionId);
    },
    ResumeChat: (sessionId: unknown, afterCut: unknown): Promise<ActionResult> => resumeChat(pastChats, sessionId, afterCut === true),
    RenameChat: (pid: unknown, name: unknown): Promise<ActionResult> => onChat(pid, (chat: number) => renameChat(chat, textArg(name))),
    RecolorChat: (pid: unknown, color: unknown): Promise<ActionResult> => onChat(pid, (chat: number) => recolorChat(chat, textArg(color))),
    SendMessage: (pid: unknown, text: unknown, uploads: unknown): Promise<ActionResult> =>
      onChat(pid, (chat: number) => (isAttachmentList(uploads) ? sendMessage(chat, textArg(text), uploads) : Promise.resolve(NOT_IMAGES))),
    InterruptChat: (pid: unknown): Promise<ActionResult> => onChat(pid, interruptChat),
    PauseChats: (targets: unknown): Promise<PauseReport> => (isPauseTargets(targets) ? pauseChats(targets) : Promise.resolve(NOTHING_REACHED)),
    ContinueChats: (pids: unknown): Promise<PauseReport> => (isPidList(pids) ? continueChats(pids) : Promise.resolve(NOTHING_REACHED)),
    AnswerQuestion: (sessionId: unknown, fingerprint: unknown, answer: unknown): Promise<ActionResult> =>
      answerQuestion(radar, sessionId, fingerprint, answer),
    SubmitAnswers: (sessionId: unknown, fingerprint: unknown): Promise<ActionResult> => submitAnswers(radar, sessionId, fingerprint),
    AnswerQuestionSet: (sessionId: unknown, questionId: unknown, answers: unknown): Promise<ActionResult> =>
      answerQuestionSet(radar, sessionId, questionId, answers),
    DeclineQuestion: (sessionId: unknown): Promise<ActionResult> => declineQuestion(radar, sessionId),
    StopAgent: (sessionId: unknown, agentId: unknown): Promise<ActionResult> => stopAgent(radar, sessionId, agentId),
    InterruptShell: (sessionId: unknown, taskId: unknown): Promise<ActionResult> => interruptShell(radar, sessionId, taskId),
  };
}

function onChat(pid: unknown, action: (pid: number) => Promise<ActionResult>): Promise<ActionResult> {
  return isPid(pid) ? action(pid) : Promise.resolve(NOT_A_CHAT);
}
