import { statusAge } from '../../shared/chat-time';
import type { ChatColor } from '../../shared/chat-colors';
import type { ActionResult, AttachmentUpload, ChatSnapshot, TurnProgress } from '../../shared/types';
import { requireElement } from '../dom';
import { formatDuration } from '../format';
import { CLOSE_ICON, OPEN_OUTSIDE_ICON, PENCIL_ICON, TERMINAL_ICON } from '../icons';
import { Lightbox } from '../lightbox';
import { chatColor, textOnChatColor } from '../palette';
import { renderSpinner } from '../spinner';
import { chatStatusLabel } from '../status-label';
import { AgentView } from './agent-view';
import type { AgentTitle } from './agent-view';
import { ColorPicker } from './color-picker';
import type { ComposerDraft } from './draft-store';
import { DraftStore } from './draft-store';
import { Composer } from './composer';
import type { DictationTarget } from './hands-free/dictation-target';
import { PanelResizer } from './panel-resizer';
import type { Direction } from './message-navigator';
import { MessageNavigator } from './message-navigator';
import { ThreadZoom } from './thread-zoom';
import { WorkingIndicator } from './working-indicator';
import { DeviceLinks } from './device-links';
import { ChatSettingsPopover } from './settings/chat-settings-popover';
import { RenameForm } from './rename-form';
import { listenForSpaceToTalk } from './space-to-talk';
import { isWebHost } from '../host';
import type { ChatPatch } from '../pending-edits';
import { TranscriptList } from './transcript-list';
import { DRAWER_PAGE_ITEMS } from './paging/page-sizes';
import type { PageFetch } from './paging/paged-transcript';
import { ThreadFeed } from './paging/thread-feed';
import type { PendingChat } from '../pending-chat';
import { PendingPlaceholder } from './pending-placeholder';

const STATUS_CLEAR_MS: number = 5000;

// How the panel shows an edit before the chat confirms it, and takes it back if delivery failed.
export interface OptimisticEdits {
  show(sessionId: string, patch: ChatPatch): void;
  undo(sessionId: string, field: keyof ChatPatch): void;
}
const PANEL_OPEN_CLASS: string = 'panel-open';
const CLOSED_CLASS: string = 'is-closed';

// Right-side panel for one chat: its history plus the actions you can take on it.
// Alt+↑/↓ scroll this much of the visible thread per press.
const THREAD_SCROLL_FRACTION: number = 0.4;

export class ChatSheet {
  private readonly root: HTMLElement = requireElement('#sheet');
  private readonly name: HTMLElement = requireElement('#sheet-name');
  private readonly meta: HTMLElement = requireElement('#sheet-meta');
  private readonly status: HTMLElement = requireElement('#sheet-status');
  private readonly lightbox: Lightbox = new Lightbox();
  private readonly messages: TranscriptList = new TranscriptList(requireElement('#sheet-messages'), this.lightbox, window.radar);
  private readonly feed: ThreadFeed = new ThreadFeed(requireElement('#sheet-messages'), this.messages, DRAWER_PAGE_ITEMS);
  private readonly rename: RenameForm = new RenameForm((name: string): void => void this.applyRename(name));
  private readonly colors: ColorPicker = new ColorPicker(requireElement('#color-picker'), (color: ChatColor): void => void this.recolor(color));
  private readonly composer: Composer = new Composer(
    (text: string, attachments: readonly AttachmentUpload[]): Promise<boolean> => this.send(text, attachments),
    (problem: string): void => this.showStatus(problem, true),
    this.lightbox,
    {
      text: (sessionId: string): string => this.drafts.get(sessionId).text,
      replace: (sessionId: string, expected: string, next: string): void => this.replaceKeptDraft(sessionId, expected, next),
    },
  );
  private readonly working: WorkingIndicator = new WorkingIndicator(requireElement('#working-indicator'), (): void => void this.interrupt());
  private readonly agentView: AgentView;
  private readonly drafts: DraftStore = new DraftStore();
  private readonly placeholder: PendingPlaceholder;
  // Sends written while the chat was still starting, released once it is live (or dropped if it never is).
  private liveWaiters: ((chat: ChatSnapshot | null) => void)[] = [];
  // Model, effort and skills, behind the header's sliders button.
  private readonly settings: ChatSettingsPopover = new ChatSettingsPopover(requireElement('#action-settings'), requireElement('#chat-settings'), {
    insertSkill: (name: string): void => this.composer.insertCommand(`/${name} `),
    report: (result: ActionResult, successText: string): void => this.report(result, successText),
    closeChat: (sessionId: string): void => this.onCloseChat(sessionId),
  });
  // The Emulator and Browser pills, for a chat that tests on an emulator or in Chrome.
  private readonly devices: DeviceLinks = new DeviceLinks((text: string, isError: boolean): void => this.showStatus(text, isError));
  private chat: ChatSnapshot | null = null;
  private statusTimer: number | undefined;
  private readonly navigator: MessageNavigator;

  // onThreadChange: the panel switched between the chat and one of its agents, so its transcript must be fetched.
  // onCloseChat: closes a chat the way the board does, so its card and this panel go at once.
  constructor(
    onClose: () => void,
    private readonly edits: OptimisticEdits,
    onThreadChange: () => void,
    private readonly onCloseChat: (sessionId: string) => void,
  ) {
    this.placeholder = new PendingPlaceholder(this.root, onClose);
    this.agentView = new AgentView(
      this.root,
      (): void => {
        if (this.chat !== null) this.update(this.chat);
        onThreadChange();
      },
      (problem: string): void => this.showStatus(problem, true),
    );
    new PanelResizer(requireElement('#panel-resizer'));
    new ThreadZoom(this.root, requireElement('#sheet-messages'));
    // Saved as it is typed, so a draft also survives quitting Orbit without leaving the chat.
    requireElement('#composer-input').addEventListener('input', (): void => this.keepDraft());
    listenForSpaceToTalk(
      // Orbit Web has no dictation, so Space stays a plain key there.
      (): boolean => !isWebHost() && this.chat !== null && this.agentView.agentId === null && !this.lightbox.isOpen && !this.rename.isOpen,
      (): void => this.composer.startDictation(),
    );
    this.navigator = new MessageNavigator({
      thread: requireElement('#sheet-messages'),
      up: requireElement('#jump-previous'),
      down: requireElement('#jump-next'),
      preview: requireElement('#jump-preview'),
    }, this.feed);
    const close: HTMLElement = requireElement('#sheet-close');
    close.innerHTML = CLOSE_ICON;
    close.addEventListener('click', onClose);
    // "Go to chat" leaves the radar for the chat's own window, hence the open-outside icon.
    // Its own Orbit window is the main way out of the panel; the terminal is one quiet icon by the name.
    requireElement('#action-window').insertAdjacentHTML('beforeend', OPEN_OUTSIDE_ICON);
    requireElement('#action-window').addEventListener('click', (): void => void this.withChat((chat) => window.radar.openChatWindow(chat.sessionId)));
    requireElement('#action-focus').innerHTML = TERMINAL_ICON;
    requireElement('#action-focus').addEventListener('click', (): void => void this.withChat((chat) => window.radar.focusChat(chat.pid)));
    // The pencil beside the name renames; the color dot before it opens the color picker.
    const pencil: HTMLElement = requireElement('#action-rename');
    pencil.innerHTML = PENCIL_ICON;
    pencil.addEventListener('click', (): void => void this.withChat((chat) => this.rename.open(chat.name)));
    requireElement('#action-color').addEventListener('click', (): void => void this.withChat((chat) => this.colors.toggle(chat.color)));
  }

  get sessionId(): string | null {
    return this.chat?.sessionId ?? null;
  }

  get agentId(): string | null {
    return this.agentView.agentId;
  }

  // Shows one of the open chat's agents instead of the chat; call after open() so its agents are known.
  openAgent(agentId: string): void {
    this.agentView.open(agentId);
  }

  // A chat that is live and shown as itself: not still starting, closed, or showing one of its agents.
  get showsLiveChat(): boolean {
    return this.chat !== null && !this.isShowingClosed && this.agentView.agentId === null;
  }

  get isWorking(): boolean {
    return this.working.isShown;
  }

  // The keyboard's way into the header's own actions, each with the confirmation its button asks for.
  startRename(): void {
    if (this.showsLiveChat) void this.withChat((chat) => this.rename.open(chat.name));
  }

  toggleSettings(): void {
    if (this.showsLiveChat) this.settings.toggle();
  }

  askToClose(): void {
    if (this.showsLiveChat) this.settings.askToClose();
  }

  askToInterrupt(): void {
    if (this.showsLiveChat) this.working.askToInterrupt();
  }

  jumpToOwnMessage(direction: Direction): void {
    void this.navigator.jump(direction);
  }

  // A step of a good part of the visible thread, so holding the keys reads through it without losing the place.
  scrollThread(direction: Direction): void {
    const thread: HTMLElement = requireElement('#sheet-messages');
    const step: number = thread.clientHeight * THREAD_SCROLL_FRACTION;
    thread.scrollBy({ top: direction === 'up' ? -step : step, behavior: 'smooth' });
  }

  // Escape first backs out of an open sub-action, then out of an agent, then closes the sheet.
  dismissSubAction(): boolean {
    if (this.settings.isOpen) {
      this.settings.hide();
      return true;
    }
    if (!this.rename.isOpen) return this.agentView.close();
    this.rename.close();
    return true;
  }

  // A chat launched a moment ago opens at once on a placeholder; open() later swaps in the live chat in place.
  openPending(chat: PendingChat): void {
    this.root.classList.remove(CLOSED_CLASS);
    this.settleWaiters(null);
    this.keepDraft();
    this.chat = null;
    this.resetForNewChat();
    this.root.classList.add('is-open');
    document.body.classList.add(PANEL_OPEN_CLASS);
    this.placeholder.show(chat);
    this.composer.followDictationTarget(this.dictationTarget());
  }

  recolorPending(launchedAt: number, color: string | null): void {
    this.placeholder.recolor(launchedAt, color);
  }

  failPending(launchedAt: number, message: string): void {
    this.placeholder.fail(launchedAt, message);
    this.settleWaiters(null);
  }

  // A pinned chat that is closed: its history, read-only, with Reopen in place of the composer.
  openClosed(chat: ChatSnapshot): void {
    this.open(chat);
    this.root.classList.add(CLOSED_CLASS);
    this.update(chat);
  }

  get isShowingClosed(): boolean {
    return this.root.classList.contains(CLOSED_CLASS);
  }

  open(chat: ChatSnapshot): void {
    this.root.classList.remove(CLOSED_CLASS);
    // What was typed while the chat was starting belongs to it; keep it through the reset below.
    const startingDraft: ComposerDraft | null = this.placeholder.isActive ? this.composer.draft() : null;
    this.placeholder.handOver();
    const isNewChat: boolean = chat.sessionId !== this.chat?.sessionId;
    if (isNewChat) this.keepDraft();
    this.chat = chat;
    if (isNewChat) this.resetForNewChat();
    if (isNewChat) this.composer.restoreDraft(startingDraft ?? this.drafts.get(chat.sessionId));
    this.settleWaiters(chat);
    this.root.classList.add('is-open');
    document.body.classList.add(PANEL_OPEN_CLASS);
    this.update(chat);
  }

  update(chat: ChatSnapshot): void {
    this.chat = chat;
    this.root.style.setProperty('--chat', chatColor(chat.color));
    this.root.style.setProperty('--on-chat', textOnChatColor(chat.color));
    const now: number = Date.now();
    this.settings.follow(chat);
    // A closed chat drives nothing any more, so it gets no device buttons.
    if (this.isShowingClosed) this.devices.clear();
    else this.devices.follow(chat.sessionId);
    this.agentView.update(chat, now);
    this.composer.followDictationTarget(this.dictationTarget());
    const agent: AgentTitle | null = this.agentView.title(now);
    this.name.textContent = agent?.name ?? chat.name;
    if (agent !== null) return void this.meta.replaceChildren(document.createTextNode(agent.meta));
    if (this.isShowingClosed) return void this.meta.replaceChildren(document.createTextNode(`${chat.repository.name} · Closed`));
    const status: string = `${chat.repository.name} · ${chatStatusLabel(chat.status)} for ${formatDuration(statusAge(chat, now))}`;
    this.meta.replaceChildren(...(chat.status === 'busy' ? [renderSpinner()] : []), document.createTextNode(status));
  }

  // Claude Code's "✻ Verb… (time · tokens)" line while the chat works; hidden once it stops.
  showProgress(chat: ChatSnapshot, progress: TurnProgress | null): void {
    if (chat.sessionId !== this.chat?.sessionId) return;
    // The line describes the chat's own turn; an open agent has its status in the header instead.
    if (chat.status === 'busy' && this.agentView.agentId === null) this.working.show(progress, chat.statusSince);
    else this.working.hide();
  }

  // Polls the latest page of the thread shown; an answer for a thread the panel has since left is ignored.
  async loadTranscript(sessionId: string, agentId: string | null, fetch: PageFetch): Promise<void> {
    if (sessionId !== this.chat?.sessionId || agentId !== this.agentView.agentId) return;
    await this.feed.refresh(sessionId, agentId === null ? sessionId : `${sessionId}/${agentId}`, fetch);
    if (sessionId !== this.chat?.sessionId) return;
    this.placeholder.clear();
    void this.messages.syncPicker(this.chat.status === 'waiting');
  }

  close(): void {
    this.settleWaiters(null);
    this.root.classList.remove(CLOSED_CLASS);
    this.keepDraft();
    this.root.classList.remove('is-open');
    this.working.hide();
    document.body.classList.remove(PANEL_OPEN_CLASS);
    this.chat = null;
    this.agentView.reset();
    this.feed.clear();
    this.rename.close();
    this.colors.hide();
    this.settings.forget();
    this.devices.clear();
    this.placeholder.clear();
    this.composer.followDictationTarget(this.dictationTarget());
    // A hidden composer that kept the caret would make every key count as typing, so the board's arrows did nothing.
    if (this.root.contains(document.activeElement) && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  // Hands-free words go to the composer on screen; there is none while the panel is closed or shows an agent
  // or a closed chat.
  private dictationTarget(): DictationTarget | null {
    if (!this.root.classList.contains('is-open') || this.isShowingClosed || this.agentView.agentId !== null) return null;
    if (this.chat !== null) return { kind: 'chat', sessionId: this.chat.sessionId };
    return this.placeholder.isActive ? { kind: 'starting' } : null;
  }

  // The words a chat was left with arrive after it; the chat on screen keeps its own text instead.
  private replaceKeptDraft(sessionId: string, expected: string, next: string): void {
    if (sessionId !== this.chat?.sessionId) this.drafts.replaceText(sessionId, expected, next);
  }

  // Whatever was typed for the chat being left waits for it to be opened again.
  private keepDraft(): void {
    if (this.chat !== null) this.drafts.set(this.chat.sessionId, this.composer.draft());
  }

  private resetForNewChat(): void {
    this.agentView.reset();
    this.feed.clear();
    this.rename.close();
    this.colors.hide();
    this.settings.forget();
    this.devices.clear();
    this.composer.reset();
    this.status.textContent = '';
  }

  private async applyRename(name: string): Promise<void> {
    const trimmed: string = name.trim();
    if (trimmed.length === 0) return;
    await this.withChat(async (chat) => {
      this.edits.show(chat.sessionId, { name: trimmed });
      const result: ActionResult = await window.radar.renameChat(chat.pid, trimmed);
      if (!result.ok) this.edits.undo(chat.sessionId, 'name');
      this.report(result, `Renamed to "${trimmed}"`);
    });
  }

  private async recolor(color: ChatColor): Promise<void> {
    this.colors.hide();
    await this.withChat(async (chat) => {
      this.edits.show(chat.sessionId, { color });
      const result: ActionResult = await window.radar.recolorChat(chat.pid, color);
      if (!result.ok) this.edits.undo(chat.sessionId, 'color');
      this.report(result, `Color set to ${color}`);
    });
  }

  private async interrupt(): Promise<void> {
    const result: ActionResult | null = await this.withChat((chat) => window.radar.interruptChat(chat.pid));
    if (result?.ok === false) this.reportFailure(result);
  }

  private async send(text: string, attachments: readonly AttachmentUpload[]): Promise<boolean> {
    if (this.chat === null && this.placeholder.isActive) this.placeholder.showQueued(text.trim());
    const chat: ChatSnapshot | null = await this.whenLive();
    if (chat === null) return false;
    const pendingId: string = this.messages.addPending(text.trim(), attachments.map(previewUrl));
    const result: ActionResult | null = await window.radar.sendMessage(chat.pid, text, attachments);
    if (result?.ok === true) this.messages.markPendingDelivered(pendingId);
    else this.messages.removePending(pendingId);
    // Success needs no status line: the message itself shows up in the thread.
    if (result?.ok === false) this.reportFailure(result);
    return result?.ok ?? false;
  }

  private whenLive(): Promise<ChatSnapshot | null> {
    if (this.chat !== null) return Promise.resolve(this.chat);
    if (!this.placeholder.isActive) return Promise.resolve(null);
    return new Promise((resolve: (chat: ChatSnapshot | null) => void): void => void this.liveWaiters.push(resolve));
  }

  private settleWaiters(chat: ChatSnapshot | null): void {
    const waiters: ((chat: ChatSnapshot | null) => void)[] = this.liveWaiters;
    this.liveWaiters = [];
    waiters.forEach((resolve: (chat: ChatSnapshot | null) => void): void => resolve(chat));
  }

  private report(result: ActionResult, successText: string): void {
    if (!result.ok) return this.reportFailure(result);
    this.showStatus(`${successText}${result.method === 'typed' ? ' (typed into the window)' : ''}`, false);
  }

  private reportFailure(result: ActionResult): void {
    this.showStatus(`Failed: ${result.error ?? 'unknown error'}`, true);
  }

  private showStatus(text: string, isError: boolean): void {
    this.status.textContent = text;
    this.status.classList.toggle('is-error', isError);
    window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout((): void => {
      this.status.textContent = '';
    }, STATUS_CLEAR_MS);
  }

  private async withChat<T>(action: (chat: ChatSnapshot) => T | Promise<T>): Promise<T | null> {
    return this.chat === null ? null : action(this.chat);
  }
}

// The tray revokes its own previews as soon as it clears, so the sent message needs copies of its own.
function previewUrl(attachment: AttachmentUpload): string {
  return URL.createObjectURL(new Blob([new Uint8Array(attachment.bytes)], { type: attachment.mediaType }));
}
