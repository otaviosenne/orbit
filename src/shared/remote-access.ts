import type { InvokeChannel } from './ipc-routing';

// How far Orbit Web may reach. 'read' changes nothing. 'chat' acts on one open chat, named by its pid as the first
// argument, which the server checks against the open chats. 'action' acts on something the route itself validates
// (a saved shortcut, a past chat, a question on screen, an agent). 'desktop' is never reachable from the web.
export type RemoteAccess = 'read' | 'chat' | 'action' | 'desktop';

// A Record over every routed channel: a channel added without deciding its remote access fails the type check.
export const REMOTE_ACCESS = {
  GetChats: 'read',
  GetTranscript: 'read',
  GetAgentTranscript: 'read',
  GetImage: 'read',
  GetTurnProgress: 'read',
  GetChatColor: 'read',
  GetUsage: 'read',
  ListLaunchers: 'read',
  // Only saved shortcuts: the route takes a name and re-reads the command from the launcher list.
  OpenLauncher: 'action',
  // Writes a command into the launcher file, so it stays where the user can see the form.
  AddShortcut: 'desktop',
  // A system dialog on the desktop's screen.
  ChooseFolder: 'desktop',
  ListPastChats: 'read',
  GetTimelineHistory: 'read',
  ResumeChat: 'action',
  // Moves the desktop's focus, which helps nobody away from it.
  FocusChat: 'desktop',
  RenameChat: 'chat',
  RecolorChat: 'chat',
  SendMessage: 'chat',
  // Ends a Claude Code process; too destructive for a lost phone.
  CloseChat: 'desktop',
  InterruptChat: 'chat',
  OpenChatWindow: 'desktop',
  GetQuestionPicker: 'read',
  AnswerQuestion: 'action',
  SubmitAnswers: 'action',
  AnswerQuestionSet: 'action',
  StopAgent: 'action',
  GetShellOutput: 'read',
  // The route finds the command's processes itself, from the session and task ids, under that chat only.
  InterruptShell: 'action',
  GetChatSettings: 'read',
  ListSkills: 'read',
  SetChatModel: 'chat',
  SetChatEffort: 'chat',
  GetChatPermissions: 'read',
  SetPermissionMode: 'action',
  // The emulator and browser buttons focus desktop windows, so the web hides them and needs none of the three.
  GetChatDevices: 'desktop',
  FocusChatEmulator: 'desktop',
  FocusChatBrowser: 'desktop',
  // Dictation streams microphone audio over IPC; Orbit Web leaves it out of its first version.
  DictationStart: 'desktop',
  DictationFinish: 'desktop',
  // CPU and memory of the open chats' own process trees; the server picks the processes, never the caller.
  GetChatResources: 'read',
} as const satisfies Record<InvokeChannel, RemoteAccess>;

type AccessTable = typeof REMOTE_ACCESS;

// The channels Orbit Web can call; a route table for the server must answer each of them.
export type RemoteChannel = { [K in InvokeChannel]: AccessTable[K] extends 'desktop' ? never : K }[InvokeChannel];

export function remoteAccessOf(channel: string): RemoteAccess | null {
  return Object.hasOwn(REMOTE_ACCESS, channel) ? REMOTE_ACCESS[channel as InvokeChannel] : null;
}

export function isRemoteChannel(channel: string): channel is RemoteChannel {
  const access: RemoteAccess | null = remoteAccessOf(channel);
  return access !== null && access !== 'desktop';
}
