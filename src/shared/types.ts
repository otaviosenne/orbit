import type { ChatColor } from './chat-colors';
import type { EffortLevel, ModelChoice } from './chat-settings';
import type { CycledPermissionMode, PermissionMode } from './permission-modes';
import type { RemoteSettings } from './remote-settings';
import type { ResourceSnapshot } from './chat-resources';

export type ChatStatus = 'busy' | 'waiting' | 'idle' | 'shell' | 'unknown';

export type AgentState = 'running' | 'quiet' | 'done';

export interface AgentSnapshot {
  readonly id: string;
  readonly description: string;
  readonly agentType: string;
  readonly state: AgentState;
  readonly startedAt: number;
  readonly lastActivityAt: number;
  readonly endedAt: number | null;
}

// "killed" covers TaskStop and Orbit's own interrupts; Claude Code reports a shell killed from outside as failed.
export type ShellStatus = 'running' | 'completed' | 'failed' | 'killed';

// A background shell of a chat, from its Bash call until a few minutes after Claude Code reports it ended.
export interface ShellSnapshot {
  // Claude Code's background task id, as its task notifications and TaskStop name it.
  readonly id: string;
  readonly command: string;
  readonly description: string | null;
  readonly startedAt: number;
  readonly status: ShellStatus;
  readonly endedAt: number | null;
  readonly exitCode: number | null;
}

// The end of a background shell's output file, cleaned up for display.
export interface ShellOutput {
  readonly text: string;
  // The file was longer than what was read, so earlier lines are missing.
  readonly isTruncated: boolean;
}

export interface Repository {
  readonly name: string;
  readonly root: string;
}

export interface ChatSnapshot {
  readonly sessionId: string;
  readonly pid: number;
  readonly name: string;
  readonly color: string | null;
  readonly repository: Repository;
  // The folder the chat was started in, and when its process started.
  readonly cwd: string;
  readonly startedAt: number;
  readonly status: ChatStatus;
  readonly statusSince: number;
  // When Claude last wrote in this chat (null before its first reply); survives a resume, unlike statusSince.
  readonly lastReplyAt: number | null;
  readonly agents: readonly AgentSnapshot[];
  // Commands the chat left running in the background (Bash run_in_background, or moved there mid-run).
  readonly shells: readonly ShellSnapshot[];
  // Its terminal window is the one focused right now, so the user is looking at it.
  readonly isFocused: boolean;
}

export type MessageRole = 'user' | 'assistant';

interface TranscriptItemBase {
  readonly id: string;
  readonly timestamp: number;
}

// An image pasted into a message; its pixels are fetched only when opened (getImage with this key).
export interface MessageImage {
  readonly number: number;
  readonly key: string;
}

export interface MessageItem extends TranscriptItemBase {
  readonly kind: 'message';
  readonly role: MessageRole;
  readonly text: string;
  readonly images: readonly MessageImage[];
}

// A tool call and, once it arrives, its result; output stays null while the tool is still running.
export interface ToolItem extends TranscriptItemBase {
  readonly kind: 'tool';
  readonly name: string;
  readonly summary: string;
  readonly input: string;
  readonly output: string | null;
  readonly isError: boolean;
}

export type PeerDirection = 'in' | 'out';

// A message exchanged with another Claude chat on this machine.
export interface PeerItem extends TranscriptItemBase {
  readonly kind: 'peer';
  readonly direction: PeerDirection;
  readonly chat: string;
  readonly text: string;
}

export type NoticeTone = 'info' | 'error';

// Something that happened in the chat that is not a message: an agent finishing, a slash command, a compaction.
export interface NoticeItem extends TranscriptItemBase {
  readonly kind: 'notice';
  readonly tone: NoticeTone;
  readonly title: string;
  readonly detail: string | null;
}

// The end of one of Claude's turns and how long it worked.
export interface TurnItem extends TranscriptItemBase {
  readonly kind: 'turn';
  readonly durationMs: number;
}

// ---------- Questions (Claude Code's AskUserQuestion) ----------

export interface QuestionOption {
  readonly label: string;
  readonly description: string;
}

export interface Question {
  readonly question: string;
  readonly header: string;
  readonly options: readonly QuestionOption[];
  readonly multiSelect: boolean;
  // Options with previews are drawn beside a preview box, a layout Orbit cannot drive with keys.
  readonly hasPreviews: boolean;
}

// 'expired': the conversation moved on without an answer being recorded (an old, interrupted session).
export type QuestionState = 'pending' | 'answered' | 'declined' | 'expired';

// A multiple-choice prompt Claude put to the user; it blocks the chat until answered.
export interface QuestionItem extends TranscriptItemBase {
  readonly kind: 'question';
  readonly questions: readonly Question[];
  readonly state: QuestionState;
  // Each question's recorded answer, in question order; null where none was recorded.
  readonly answers: readonly (string | null)[];
  // What the chat was told when per-question answers are missing, such as why it was declined.
  readonly note: string | null;
}

// The user's pick for one question: option indexes, plus the text typed in "Other" (null when unused).
export interface QuestionAnswer {
  readonly selected: readonly number[];
  readonly other: string | null;
}

// Claude Code writes the question into the transcript only once it is answered, so a waiting one is read off
// the chat's terminal: the picker shows one question (tab) at a time, then a review of every answer.
export interface PickerTab {
  readonly header: string;
  readonly answered: boolean;
}

export interface PickerChoice extends QuestionOption {
  // Already ticked in the terminal (multi-select only).
  readonly ticked: boolean;
}

export interface PickerQuestionView {
  readonly kind: 'question';
  // Identifies what is on screen, so an answer never lands on a different question than the one shown.
  readonly fingerprint: string;
  readonly tabs: readonly PickerTab[];
  // The tab on screen, when the terminal shows which one it is.
  readonly current: number | null;
  readonly question: string;
  readonly multiSelect: boolean;
  readonly options: readonly PickerChoice[];
  // Text already typed in the picker's "Type something" field.
  readonly other: string | null;
  // A lone single-choice question has no review: picking sends the answer.
  readonly hasReview: boolean;
}

export interface PickerReviewLine {
  readonly question: string;
  readonly answer: string;
}

export interface PickerReviewView {
  readonly kind: 'review';
  readonly fingerprint: string;
  readonly tabs: readonly PickerTab[];
  readonly lines: readonly PickerReviewLine[];
}

// A picker is on screen but in a layout Orbit cannot read (option previews, a newer Claude Code).
export interface PickerUnreadableView {
  readonly kind: 'unreadable';
}

// The whole question set, known from the transcript while its picker is on the chat's terminal (even cut off):
// the card steps through every question and sends all the answers at once.
export interface PickerSetView {
  readonly kind: 'set';
  // The AskUserQuestion tool_use id.
  readonly questionId: string;
  readonly questions: readonly Question[];
}

export type QuestionPicker = PickerQuestionView | PickerReviewView | PickerUnreadableView | PickerSetView;

export type TranscriptItem = MessageItem | ToolItem | PeerItem | NoticeItem | TurnItem | QuestionItem;

export interface UsageLimit {
  readonly label: string;
  readonly percent: number;
  readonly resetsAt: number | null;
}

export interface UsageShare {
  readonly label: string;
  readonly percent: number;
}

export interface UsageSnapshot {
  readonly limits: readonly UsageLimit[];
  readonly breakdown: readonly UsageShare[];
  readonly fetchedAt: number | null;
  readonly error: string | null;
}

// 'socket' reached the chat through kitty remote control; 'typed' had to focus the window and type.
// 'signal': the action was a signal sent straight to a process, such as interrupting a background command.
export type DeliveryMethod = 'socket' | 'typed' | 'signal';

export interface ActionResult {
  readonly ok: boolean;
  readonly method: DeliveryMethod | null;
  readonly error: string | null;
}

export interface TranscriptionResult {
  readonly ok: boolean;
  readonly text: string;
  readonly error: string | null;
}

// error explains why dictation could not start (for example, no Claude Code login).
export interface DictationStart {
  readonly session: number;
  readonly error: string | null;
}

export interface DictationTranscript {
  readonly session: number;
  readonly text: string;
}

// One project from the SUPER+D launcher: a name and the shell command that opens a chat for it.
// chatName is what the new chat is called; folder is known only for shortcuts added from Orbit.
export interface LauncherEntry {
  readonly name: string;
  readonly command: string;
  readonly chatName: string;
  readonly folder: string | null;
}

// A New chat shortcut as typed in its form: the label in the list, the new chat's name and its folder.
export interface ShortcutDraft {
  readonly label: string;
  readonly chatName: string;
  readonly folder: string;
}

// The turn a working chat is in: when it began and how many tokens Claude has written so far.
export interface TurnProgress {
  readonly startedAt: number;
  readonly outputTokens: number;
}

// An image attached in the composer, sent along with a message.
export interface AttachmentUpload {
  readonly name: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
}

// A chat that is not open right now but can be resumed where it left off.
export interface PastChat {
  readonly sessionId: string;
  readonly title: string;
  readonly repository: Repository;
  readonly lastActivityAt: number;
  readonly sizeBytes: number;
}

// A stretch of time, such as one turn a chat spent working.
export interface TimeSpan {
  readonly start: number;
  readonly end: number;
}

// A chat that is closed now but worked inside the timeline's window: its turns and its agents.
export interface ClosedChatActivity {
  readonly sessionId: string;
  readonly title: string;
  readonly repository: Repository;
  readonly color: string | null;
  readonly lastActivityAt: number;
  readonly turns: readonly TimeSpan[];
  readonly agents: readonly AgentSnapshot[];
}

// ---------- Chat settings (model, effort, skills) ----------

// What a chat runs on, read from its transcript; null until the chat has replied or run /model or /effort.
export interface ChatSettings {
  // An id ("claude-opus-5-5"), an alias ("sonnet") or a display name ("Sonnet 5.5"), as Claude Code recorded it.
  readonly model: string | null;
  readonly effort: EffortLevel | null;
}

// The chat's permission mode; Orbit switches it by pressing Shift+Tab in the chat's terminal.
export interface ChatPermissions {
  // Read off the terminal's footer when Orbit can see it, otherwise from the transcript (which lags a turn).
  readonly mode: PermissionMode | null;
  // Why the mode cannot be switched from Orbit right now; null when it can.
  readonly lockedReason: string | null;
}

export type SkillSource = 'project' | 'user' | 'plugin';

// A skill the chat can run as /<name>; plugin skills are named "<plugin>:<skill>".
export interface SkillEntry {
  readonly name: string;
  readonly description: string;
  readonly source: SkillSource;
}

// ---------- Devices a chat tests on (Android emulator, Claude in Chrome tab) ----------

// The emulator window the chat used last that is still open, named "<avd>:<port>" like its window title.
export interface EmulatorLink {
  readonly label: string;
}

// The Claude in Chrome tab the chat used last; title is its last known title (null when never reported).
export interface BrowserLink {
  readonly title: string | null;
  readonly url: string | null;
}

// What the panel's Emulator and Browser buttons and the cards' device icons lead to; null hides that button.
export interface ChatDevices {
  readonly emulator: EmulatorLink | null;
  readonly browser: BrowserLink | null;
}

// 'exact': the emulator or the very tab is in front now. 'window': only a Chrome window could be focused,
// the tab may sit behind another one. 'missing': nothing to focus any more.
export type DeviceFocus = 'exact' | 'window' | 'missing';

export interface RadarApi {
  getImage(sessionId: string, key: string): Promise<string | null>;
  getTurnProgress(sessionId: string): Promise<TurnProgress | null>;
  // The chat's last /color, open or closed; null when it never set one.
  getChatColor(sessionId: string): Promise<string | null>;
  listLaunchers(): Promise<LauncherEntry[]>;
  openLauncher(name: string): Promise<ActionResult>;
  addShortcut(draft: ShortcutDraft): Promise<ActionResult>;
  // Asks for a folder with the system picker; null when the user cancels.
  chooseFolder(): Promise<string | null>;
  listPastChats(): Promise<PastChat[]>;
  // Closed chats that were active since that time, for the timeline's "All" mode.
  getTimelineHistory(sinceMs: number): Promise<ClosedChatActivity[]>;
  // Reopens a listed past chat in a new terminal in the folder it was started in.
  resumeChat(sessionId: string): Promise<ActionResult>;
  prepareDictation(): void;
  startDictation(): Promise<DictationStart>;
  feedDictation(session: number, pcm: Uint8Array): void;
  finishDictation(session: number): Promise<TranscriptionResult>;
  cancelDictation(session: number): void;
  onDictationTranscript(listener: (transcript: DictationTranscript) => void): void;
  getChats(): Promise<ChatSnapshot[]>;
  // The last `limit` items (150 when left out); fewer than asked means the thread has nothing older.
  getTranscript(sessionId: string, limit?: number): Promise<TranscriptItem[]>;
  getAgentTranscript(sessionId: string, agentId: string, limit?: number): Promise<TranscriptItem[]>;
  getUsage(): Promise<UsageSnapshot>;
  focusChat(pid: number): Promise<void>;
  renameChat(pid: number, name: string): Promise<ActionResult>;
  recolorChat(pid: number, color: ChatColor): Promise<ActionResult>;
  sendMessage(pid: number, text: string, attachments: readonly AttachmentUpload[]): Promise<ActionResult>;
  closeChat(pid: number): Promise<ActionResult>;
  interruptChat(pid: number): Promise<ActionResult>;
  // Pops the chat out into its own window, or brings back the one it already has.
  openChatWindow(sessionId: string): Promise<void>;
  // The question picker on the chat's terminal right now; null when none is showing.
  getQuestionPicker(sessionId: string): Promise<QuestionPicker | null>;
  // Answers the question on screen (matched by fingerprint); a lone question resolves once the chat recorded it.
  answerQuestion(sessionId: string, fingerprint: string, answer: QuestionAnswer): Promise<ActionResult>;
  // Answers every question of a set (PickerSetView) in the terminal and submits; resolves once the chat recorded it.
  answerQuestionSet(sessionId: string, questionId: string, answers: readonly QuestionAnswer[]): Promise<ActionResult>;
  // Confirms the picker's review step; resolves once the chat recorded the answers.
  submitAnswers(sessionId: string, fingerprint: string): Promise<ActionResult>;
  // Stops one running agent of the chat; resolves once the chat marked that agent stopped.
  stopAgent(sessionId: string, agentId: string): Promise<ActionResult>;
  // The end of a background command's output; null when it has none or the chat no longer lists it.
  getShellOutput(sessionId: string, taskId: string): Promise<ShellOutput | null>;
  // Ends a running background command by signalling its processes; resolves once the chat reports it ended.
  interruptShell(sessionId: string, taskId: string): Promise<ActionResult>;
  // The chat's current model and effort; changes typed in its terminal show up too.
  getChatSettings(sessionId: string): Promise<ChatSettings>;
  // The skills /skills lists for the chat: its project's, the user's and enabled plugins'.
  listSkills(sessionId: string): Promise<SkillEntry[]>;
  setChatModel(pid: number, model: ModelChoice): Promise<ActionResult>;
  setChatEffort(pid: number, effort: EffortLevel): Promise<ActionResult>;
  getChatPermissions(sessionId: string): Promise<ChatPermissions>;
  // Resolves once the chat's footer shows the mode, or fails when the chat does not offer it.
  setPermissionMode(sessionId: string, mode: CycledPermissionMode): Promise<ActionResult>;
  // The emulator and browser tab the chat worked with that are still open, for the panel's and the cards' device buttons.
  getChatDevices(sessionId: string): Promise<ChatDevices>;
  // Focuses the chat's emulator window, switching to its workspace.
  focusChatEmulator(sessionId: string): Promise<DeviceFocus>;
  // Brings the chat's Chrome tab to front when Chrome allows it, otherwise the Chrome window most likely to hold it.
  focusChatBrowser(sessionId: string): Promise<DeviceFocus>;
  // CPU and memory of every open chat's process tree, measured since the previous call.
  getChatResources(): Promise<ResourceSnapshot>;
  // ---------- Orbit Web (remote access); desktop window only ----------
  getRemoteSettings(): Promise<RemoteSettings>;
  setRemoteEnabled(enabled: boolean): Promise<RemoteSettings>;
  setRemoteExternalUrl(url: string): Promise<RemoteSettings>;
  // A new token signs every paired phone out.
  regenerateRemoteToken(): Promise<RemoteSettings>;
}
