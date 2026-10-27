import { NeedsYouWatch } from './needs-you-watch';
import { fitBoard } from './board/fit-board';
import { ChatSuspension } from './suspend/chat-suspension';
import type { ClosedChat } from './suspend/closed-chats';
import { ClosedChats } from './suspend/closed-chats';
import { SUSPENDED_TOGGLE_SELECTOR } from './views/suspended-row';
import { closedChatSnapshot } from './board/closed-chat-info';
import { closedCardLabel } from './views/closed-card';
import { CardPreview } from './board/card-preview';
import type { ActionResult, ChatDevices, ChatSnapshot, DeviceFocus, UsageSnapshot, PastChat } from '../shared/types';
import type { BoardColumn, ColumnKey } from './views/board-columns';
import { toBoardColumns } from './views/board-columns';
import { TIMELINE_AGENT_ATTRIBUTE } from './views/timeline-track';
import { CardDrag } from './board/card-drag';
import { applyDrop } from './board/apply-drop';
import type { DropAction } from './board/drop-rules';
import { BoardMotion } from './board/board-motion';
import type { CardBox } from './board/card-moves';
import { landingCardKey } from './board/card-keys';
import { CardOrder } from './board/card-order';
import type { BoardZone } from './board/drop-rules';
import type { ReorderTarget } from './board/reorder-target';
import { moveInOrder } from './board/reorder-target';
import { RestingPins } from './board/resting-pins';
import { BoardDevices } from './board/board-devices';
import type { CardDeviceKind } from './board/card-devices';
import { cardDeviceAt, focusCardDevice } from './board/card-devices';
import type { RestingColumn } from './views/board-columns';
import { resumedChatTarget } from './launch-watch';
import { OpenChatsMemory, type RememberedChat } from './restore/open-chats-memory';
import type { LeftOpenChat } from './suspend/closed-chats';
import { PinnedInfoStore } from './board/pinned-info';
import { installTooltips } from './tooltip';
import { attachAppMenu } from './app-menu';
import { ChatPause } from './pause/chat-pause';
import type { RemoteSettings } from '../shared/remote-settings';
import { PAIRING_HASH_KEY } from '../shared/remote-settings';
import { GEAR_ICON } from './icons';
import { requireElement } from './dom';
import type { ViewName } from './nav';
import { VIEW_ATTRIBUTE, renderNav } from './nav';
import type { ChatPatch } from './pending-edits';
import { NewChatButton } from './new-chat-button';
import { LaunchPanel } from './launch-panel';
import { LaunchWatch } from './launch-watch';
import { ResumeButton } from './resume/resume-button';
import { PendingEdits } from './pending-edits';
import { ChatSheet } from './sheet/chat-sheet';
import { loadThread } from './sheet/thread-loader';
import { SeenTracker } from './seen-tracker';
import type { ThemePreference } from './theme';
import { applyTheme, isThemePreference, loadTheme, saveTheme } from './theme';
import { THEME_CHOICE_ATTRIBUTE } from './views/appearance-section';
import type { BoardMarks } from './views/board-view';
import { SESSION_ATTRIBUTE, renderBoard } from './views/board-view';
import { CardMenu } from './board/card-menu';
import type { CardMenuTarget } from './board/card-menu';
import { CardRename } from './board/card-rename';
import { PinnedChats } from './board/pinned-chats';
import { ClosingChats } from './board/closing-chats';
import type { SettingsLayout } from './views/settings-view';
import { renderSettings } from './views/settings-view';
import type { SettingsPage } from './views/settings-pages';
import { DEFAULT_SETTINGS_PAGE, availablePages } from './views/settings-pages';
import { renderAppearanceSection } from './views/appearance-section';
import { renderUsageSection } from './views/usage-section';
import { UsageBadge } from './usage/usage-badge';
import { SignInBadge, openSignIn } from './usage/sign-in-button';
import type { TimelineChats } from './views/timeline-view';
import { mountTimeline, renderTimeline } from './views/timeline-view';
import { GridView } from './views/grid/grid-view';
import { ListView } from './views/list/list-view';
import { Lightbox } from './lightbox';
import type { TimelineRange } from './views/timeline-range';
import { isTimelineRange, loadTimelineRange, saveTimelineRange } from './views/timeline-range';
import { TIMELINE_RANGE_ATTRIBUTE } from './views/timeline-range-control';
import { TimelineHistoryFeed } from './views/timeline-history-feed';
import type { TimelineScope } from './views/timeline-scope';
import { isTimelineScope } from './views/timeline-scope';
import { TIMELINE_SCOPE_ATTRIBUTE } from './views/timeline-scope-control';
import type { TimelineControls } from './views/timeline-header';
import type { TimelineMode } from './views/timeline-mode';
import { isTimelineMode, loadTimelineMode, saveTimelineMode } from './views/timeline-mode';
import { TIMELINE_MODE_ATTRIBUTE } from './views/timeline-mode-control';
import { TimelineLinesView } from './views/timeline-lines/timeline-lines-view';
import { renderWordmark } from './wordmark';
import { isTouchWeb, isWebHost } from './host';
import { RemoteSection } from './views/remote-section';
import { ResourcesSection } from './views/resources-section';
import { BoardFocus } from './board/board-focus';
import { HelpModal } from './help/help-modal';
import { VOICE_HELP } from './help/voice-help';
import { availableQuestions } from './help/faq';
import { availableShortcuts } from './shortcuts/shortcut-catalog';
import { installShortcutDispatcher } from './shortcuts/shortcut-dispatcher';
import { appShortcutBindings } from './shortcuts/bindings/app-bindings';
import { isOverlayOpen } from './shortcuts/overlay-guard';
import { installShortcutTooltips } from './shortcuts/shortcut-tooltips';
import { installVoiceCommandContext } from './sheet/voice/commands/command-context';
import { chatNumbers } from './voice-nav/chat-numbers';
import { createNavigationContext } from './voice-nav/navigation-context';
import { showVoiceNotice } from './voice-nav/voice-notice';
import { TILE_SESSION_ATTRIBUTE, TILE_SESSION_SELECTOR } from './views/grid/grid-tile';
import type { VoiceSelector } from './voice-nav/voice-selector';

const CHATS_POLL_MS: number = 2000;
const USAGE_POLL_MS: number = 30_000;
const CLOSE_KEY: string = 'Escape';
const PRIMARY_BUTTON: number = 0;

const nav: HTMLElement = requireElement('#nav');
const settingsButton: HTMLButtonElement = requireElement('#settings-button');
const viewRoot: HTMLElement = requireElement('#view');
const boardFocus: BoardFocus = new BoardFocus(viewRoot);
// The Active/Idle split depends on the window's height too.
window.addEventListener('resize', (): void => {
  if (view === 'board') fitBoard(viewRoot);
});
// A finger has no hover, so Orbit Web on a phone never shows the card preview (it listens to the mouse only).
new CardPreview(viewRoot);
// Cards glide to their new place instead of jumping there when the board is rebuilt.
const boardMotion: BoardMotion = new BoardMotion();
const needsYouWatch: NeedsYouWatch = new NeedsYouWatch();
const help: HelpModal = new HelpModal({ shortcuts: availableShortcuts(isWebHost()), voice: VOICE_HELP, questions: availableQuestions(isWebHost()) });
const grid: GridView = new GridView(new Lightbox(), (list: readonly ChatSnapshot[], now: number): readonly BoardColumn[] =>
  toBoardColumns(list, (chat: ChatSnapshot): boolean => seen.isUnseen(chat), now, (chat: ChatSnapshot): RestingColumn | null => restingPins.pinOf(chat)),
);
// Rows open on release, so a press-and-hold can become a drag that reorders the list.
const listView: ListView = new ListView({ open: (sessionId: string): void => toggleSheet(sessionId), changed: (): void => renderView() });
const pendingEdits: PendingEdits = new PendingEdits();
// Orbit Web's own settings exist only in the desktop window: a phone must not be able to read or change its token.
const remoteSection: RemoteSection | null = isWebHost() ? null : new RemoteSection();
const resourcesSection: ResourcesSection = new ResourcesSection((): readonly ChatSnapshot[] => chats);
const seen: SeenTracker = new SeenTracker(Date.now());
const pins: PinnedChats = new PinnedChats();
const pinnedInfo: PinnedInfoStore = new PinnedInfoStore();
const restingPins: RestingPins = new RestingPins();
const openChats: OpenChatsMemory = new OpenChatsMemory();
const chatPause: ChatPause = new ChatPause((): readonly ChatSnapshot[] => chats, window.radar);
const cardOrder: CardOrder = new CardOrder();
const suspension: ChatSuspension = new ChatSuspension({ close: closeChat, changed: (): void => showChats() });
const closedChats: ClosedChats = new ClosedChats(pins, pinnedInfo, suspension, (): readonly ChatSnapshot[] => chats, (): readonly LeftOpenChat[] => leftOpenChats());
const boardDevices: BoardDevices = new BoardDevices(
  (sessionId: string): Promise<ChatDevices> => window.radar.getChatDevices(sessionId),
  (): void => {
    if (view === 'board') renderView();
  },
);
// Board cards open on release instead of press, so a press can turn into a drag (to Pinned, or between Active and Idle).
const cardDrag: CardDrag = new CardDrag(viewRoot, {
  click: (sessionId: string): void => toggleSheet(sessionId),
  drop: (sessionId: string, action: DropAction, landing: CardBox): void => {
    applyDrop(sessionId, action, {
      pin: (id: string): void => pins.pin(id),
      unpin: (id: string): void => pins.unpin(id),
      rest: (id: string, to: RestingColumn): void => {
        const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === id);
        if (chat !== undefined) restingPins.set(chat, to);
      },
      suspend: (id: string): void => requestSuspend(id, null),
      reorder: (id: string, zone: BoardZone, target: ReorderTarget): void => reorderCards(id, zone, target),
    });
    // Optimistic: the card lands in its new place now, not at the next poll.
    boardMotion.land(landingCardKey(sessionId, action), landing);
    renderView();
  },
  changed: (): void => renderView(),
});
// The section's cards in the order they are drawn, which is the order the user's drag moves one of them within.
function displayedOrder(zone: BoardZone): string[] {
  const cards: NodeListOf<HTMLElement> = viewRoot.querySelectorAll<HTMLElement>(`[data-drop-zone="${zone}"] .card[data-${SESSION_ATTRIBUTE}]`);
  return [...cards].flatMap((card: HTMLElement): string[] => (card.dataset[SESSION_ATTRIBUTE] === undefined ? [] : [card.dataset[SESSION_ATTRIBUTE]]));
}

function reorderCards(sessionId: string, zone: BoardZone, target: ReorderTarget): void {
  const order: string[] = moveInOrder(displayedOrder(zone), sessionId, target);
  if (zone === 'pinned') pins.setOrder(order);
  else cardOrder.set(zone, order);
}

const cardRename: CardRename = new CardRename((sessionId: string, name: string): void => void renameChat(sessionId, name), (): void => renderView());
const cardMenu: CardMenu = new CardMenu({
  openWindow: (target: CardMenuTarget): void => void window.radar.openChatWindow(target.sessionId),
  goToChat: (target: CardMenuTarget): void => {
    const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === target.sessionId);
    if (chat !== undefined) void window.radar.focusChat(chat.pid);
  },
  togglePin: (target: CardMenuTarget): void => {
    pins.toggle(target.sessionId);
    renderView();
  },
  rename: (target: CardMenuTarget): void => {
    const card: HTMLElement | null = liveCard(target);
    if (card !== null) cardRename.start(card, target.sessionId, target.name);
  },
  suspend: (target: CardMenuTarget): void => requestSuspend(target.sessionId, liveCard(target)),
  close: (target: CardMenuTarget): void => void closeChat(target.sessionId),
  reopen: (target: CardMenuTarget): void => void reopenClosed(target.sessionId),
  removeSuspended: (target: CardMenuTarget): void => suspension.remove(target.sessionId),
  removeLeftOpen: (target: CardMenuTarget): void => {
    openChats.forget(target.sessionId);
    renderView();
  },
});
const closing: ClosingChats = new ClosingChats();
const sheet: ChatSheet = new ChatSheet(closeSheet, {
  show: (sessionId: string, patch: ChatPatch): void => {
    pendingEdits.set(sessionId, patch, Date.now());
    showChats();
  },
  undo: (sessionId: string, field: keyof ChatPatch): void => {
    pendingEdits.drop(sessionId, field);
    showChats();
  },
}, (): void => void refreshSheet(), (sessionId: string): void => void closeChat(sessionId), {
  suspend: isWebHost() ? null : (sessionId: string): void => suspendNow(sessionId),
  reopen: reopenClosed,
});
const launches: LaunchPanel = new LaunchPanel(new LaunchWatch((): string | null => sheet.sessionId), {
  sheet,
  colorPreview: {
    show: (sessionId: string, color: string): void => {
      pendingEdits.set(sessionId, { color }, Date.now());
      showChats();
    },
    undo: (sessionId: string): void => {
      pendingEdits.drop(sessionId, 'color');
      showChats();
    },
  },
  canShowPanel: (): boolean => view !== 'grid',
  openChats: (): readonly ChatSnapshot[] => chats,
  openChat: (sessionId: string): void => openSheet(sessionId),
  markSeen: (chat: ChatSnapshot, now: number): void => seen.markSeen(chat.sessionId, Math.max(now, chat.lastReplyAt ?? 0)),
  render: (): void => renderView(),
});

let view: ViewName = 'board';
// The gear toggles: pressed again in Settings, it goes back to where you were.
let viewBeforeSettings: ViewName = 'board';
let settingsPage: SettingsPage = DEFAULT_SETTINGS_PAGE;
// As polled from disk, and as shown (with edits that the chats have not confirmed yet).
let polledChats: ChatSnapshot[] = [];
let chats: ChatSnapshot[] = [];
let usage: UsageSnapshot | null = null;
let theme: ThemePreference = loadTheme();
let timelineRange: TimelineRange = loadTimelineRange();
let timelineMode: TimelineMode = loadTimelineMode();
// The line view keeps its lanes across polls so they can glide when their order changes.
const timelineLines: TimelineLinesView = new TimelineLinesView();
const timelineHistory: TimelineHistoryFeed = new TimelineHistoryFeed((): void => {
  if (view === 'timeline') renderView();
});

// Where a chat's card is on the board right now, remembered so a shutdown cannot lose its place.
function columnOfChat(chat: ChatSnapshot): ColumnKey {
  const columns: readonly BoardColumn[] = toBoardColumns([chat], (candidate: ChatSnapshot): boolean => seen.isUnseen(candidate), Date.now(), (candidate: ChatSnapshot): RestingColumn | null => restingPins.pinOf(candidate));
  return columns.find((column: BoardColumn) => column.chats.length > 0)?.key ?? 'idle';
}

// Chats that are open or that Orbit remembers as left open: the ones a pause can still reach.
function knownSessionIds(): Set<string> {
  return new Set([...chats, ...openChats.closed(chats)].map((chat: { readonly sessionId: string }) => chat.sessionId));
}

function leftOpenChats(): LeftOpenChat[] {
  return openChats.closed(chats).map((entry: RememberedChat): LeftOpenChat => ({ chat: closedChatSnapshot(entry.sessionId, entry.info), column: entry.column }));
}

async function refreshChats(): Promise<void> {
  polledChats = await window.radar.getChats();
  closing.settle(polledChats, Date.now());
  suspension.settle(polledChats, Date.now());
  showChats();
  openChats.observe(chats, columnOfChat, Date.now());
  chatPause.prune(knownSessionIds());
  // Only the board shows device icons, so other views do not ask about every chat's windows.
  if (view === 'board') void boardDevices.follow(chats.map((chat: ChatSnapshot) => chat.sessionId), Date.now());
  launches.settle(Date.now());
  await refreshSheet();
}

// Re-renders from the last poll plus pending edits, without waiting for the next poll.
function showChats(): void {
  const now: number = Date.now();
  chats = suspension.visible(closing.hide(pendingEdits.apply(polledChats, now)));
  chatNumbers.sync(chats.map((chat: ChatSnapshot) => chat.sessionId), now);
  pinnedInfo.remember(chats.filter((chat: ChatSnapshot) => pins.has(chat.sessionId)));
  announceNeedsYou(now);
  trackViewing(now);
  renderView();
  const open: ChatSnapshot | undefined = chats.find((chat: ChatSnapshot) => chat.sessionId === sheet.sessionId);
  if (open !== undefined) sheet.update(open);
}

async function refreshUsage(): Promise<void> {
  usage = await window.radar.getUsage();
  usageBadge.show(usage);
  signInBadge.show(usage);
  if (view === 'settings') renderView();
}

function renderView(): void {
  const now: number = Date.now();
  nav.replaceChildren(...renderNav(view));
  settingsButton.classList.toggle('is-active', view === 'settings');
  resourcesSection.setActive(view === 'settings' && settingsPage === 'resources');
  // A card being renamed holds an open text field; rebuilding the board would throw the typing away.
  if (view === 'board' && (cardRename.isActive || cardDrag.isActive)) return;
  if (view === 'settings' && remoteSection?.isEditing === true) return;
  if (view === 'list' && listView.isPressed) return;
  if (view === 'board') {
    boardMotion.replace(viewRoot, renderBoard(chats, boardMarks(), now));
    fitBoard(viewRoot);
    boardFocus.paint();
  }
  else if (view === 'grid') showGrid(now);
  else if (view === 'list') showList(now);
  else if (view === 'timeline') showTimeline(now);
  else showSettings(now);
}

// The settings page is rebuilt on every poll; without this a scrolled page snaps back to the top.
function showSettings(now: number): void {
  const scrollTop: number = viewRoot.querySelector<HTMLElement>('.settings-column')?.scrollTop ?? 0;
  const layout: SettingsLayout = { pages: availablePages(remoteSection !== null), current: settingsPage, choose: showSettingsPage };
  const settings: HTMLElement = renderSettings(layout, settingsContent(now));
  viewRoot.replaceChildren(settings);
  const column: HTMLElement | null = settings.querySelector<HTMLElement>('.settings-column');
  if (column !== null) column.scrollTop = scrollTop;
}

// Orbit Web and Resources keep their own state between renders, so their elements are reused, not rebuilt.
function settingsContent(now: number): HTMLElement {
  if (settingsPage === 'usage') return renderUsageSection(usage, now, signIn);
  if (settingsPage === 'resources') return resourcesSection.root;
  if (settingsPage === 'web' && remoteSection !== null) return remoteSection.root;
  return renderAppearanceSection(theme);
}

function showSettingsPage(page: SettingsPage): void {
  settingsPage = page;
  const column: HTMLElement | null = viewRoot.querySelector<HTMLElement>('.settings-column');
  if (column !== null) column.scrollTop = 0;
  renderView();
}

// Tiles hold scroll, open rows and drafts, so the grid is mounted once and updated in place instead of rebuilt.
function showGrid(now: number): void {
  grid.mount(viewRoot);
  grid.update(chats, now);
}

// Rows keep focus and a press in progress across polls, so the list is mounted once and updated in place.
function showList(now: number): void {
  listView.mount(viewRoot);
  listView.update(chats, boardMarks(), now);
}

// Closed chats come from a slower fetch; the poll only asks for one when it is due. It watches the polled chats,
// not the shown ones, so a chat closed from here triggers it only once its process is really gone.
function showTimeline(now: number): void {
  timelineHistory.request(timelineRange, polledChats, now);
  const controls: TimelineControls = { range: timelineRange, scope: timelineHistory.scope, mode: timelineMode };
  const shown: TimelineChats = { open: chats, closed: timelineHistory.closed };
  if (timelineMode === 'lines') {
    timelineLines.mount(viewRoot);
    timelineLines.update(shown, now, controls);
  } else mountTimeline(viewRoot, renderTimeline(shown, now, controls));
}

function boardMarks(): BoardMarks {
  return {
    openSessionId: sheet.sessionId,
    isUnseen: (chat: ChatSnapshot): boolean => seen.isUnseen(chat),
    hasUnreadReply: (chat: ChatSnapshot): boolean => seen.hasUnreadReply(chat),
    pinnedOrder: pins.order,
    closedPins: closedChats.pinned(),
    leftOpen: closedChats.leftOpen(),
    ordered: <T extends { readonly sessionId: string }>(zone: BoardZone, cards: readonly T[]): T[] => cardOrder.apply(zone, cards),
    suspended: suspension.snapshots(),
    isSuspendedCollapsed: suspension.isCollapsed,
    restingPin: (chat: ChatSnapshot): RestingColumn | null => restingPins.pinOf(chat),
    devicesOf: (sessionId: string): ChatDevices => boardDevices.devicesOf(sessionId),
  };
}

// A card's emulator or browser icon goes straight to that window; one that has closed since drops its icon.
async function openCardDevice(kind: CardDeviceKind, sessionId: string): Promise<void> {
  const outcome: DeviceFocus = await focusCardDevice(kind, sessionId);
  if (outcome !== 'missing') return;
  console.warn(`The ${kind} of chat ${sessionId} is no longer open`);
  await boardDevices.recheck(sessionId, Date.now());
}

// Optimistic like the panel's rename: the new name shows at once and is taken back if /rename fails.
async function renameChat(sessionId: string, name: string): Promise<void> {
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat === undefined) return;
  pendingEdits.set(sessionId, { name }, Date.now());
  showChats();
  const result: ActionResult = await window.radar.renameChat(chat.pid, name);
  if (result.ok) return;
  console.error(`Could not rename ${chat.name}: ${result.error ?? 'unknown error'}`);
  pendingEdits.drop(sessionId, 'name');
  showChats();
}

// Optimistic: the chat leaves the board (and the panel) at once and comes back only if the close fails.
async function closeChat(sessionId: string): Promise<boolean> {
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat === undefined) return false;
  closing.start(sessionId, Date.now());
  if (sheet.sessionId === sessionId) sheet.close();
  showChats();
  const result: ActionResult = await window.radar.closeChat(chat.pid);
  if (result.ok) {
    openChats.forget(sessionId);
    return true;
  }
  console.error(`Could not close ${chat.name}: ${result.error ?? 'unknown error'}`);
  closing.cancel(sessionId);
  showChats();
  return false;
}

// From the board: asks above the card first when suspending would stop work. A drop has no card to point at once
// the drag ends, so it asks above the chat's card wherever the board redrew it.
function requestSuspend(sessionId: string, anchor: HTMLElement | null): void {
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  const card: HTMLElement | null = anchor ?? viewRoot.querySelector<HTMLElement>(`.board [data-${SESSION_ATTRIBUTE}="${CSS.escape(sessionId)}"]`);
  if (chat !== undefined && card !== null) suspension.request(chat, card);
}

// The panel's Suspend has already asked, if it had to.
function suspendNow(sessionId: string): void {
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat !== undefined) void suspension.suspend(chat);
}

async function refreshSheet(): Promise<void> {
  const sessionId: string | null = sheet.sessionId;
  if (sessionId === null) return;
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  // A closed chat shown read-only: a closed pin or suspended one, or a past chat looked at from Resume.
  const closed: ChatSnapshot | undefined = chat === undefined && sheet.isShowingClosed ? (closedChats.find(sessionId)?.chat ?? peekedChats.get(sessionId)) : undefined;
  if (closed !== undefined) return loadThread(sheet, closed);
  if (chat === undefined) return closeSheet();
  // A closed chat reopened some other way (Resume, its terminal) turns live in place.
  if (sheet.isShowingClosed) sheet.open(chat);
  else sheet.update(chat);
  await loadThread(sheet, chat);
}

// Clicking the chat that is already open closes the panel; any other chat opens (or switches) it.
function toggleSheet(sessionId: string): void {
  if (sheet.sessionId === sessionId) closeSheet();
  else openSheet(sessionId);
}

// Past chats looked at from Resume's eye: shown read-only like a suspended one, and reopened the same way.
const peekedChats: Map<string, ChatSnapshot> = new Map();

function peekPastChat(past: PastChat): void {
  const chat: ChatSnapshot = closedChatSnapshot(past.sessionId, {
    name: past.title, color: null, repositoryName: past.repository.name, repositoryRoot: past.repository.root,
    cwd: past.repository.root, lastReplyAt: past.lastActivityAt,
  });
  peekedChats.set(past.sessionId, chat);
  // The side panel has no place in the Panel view.
  if (view === 'grid') setView('board');
  sheet.openClosed(chat, closedCardLabel('closed-pin'));
  renderView();
  void refreshSheet();
}

// Reopen a closed pinned or suspended chat: resumed like Resume does, so its panel turns into the live chat in place.
// Resolves once the starting placeholder is up; a message sent from the closed panel waits there until the chat is live.
async function reopenClosed(sessionId: string): Promise<void> {
  const chat: ChatSnapshot | undefined = closedChats.find(sessionId)?.chat ?? peekedChats.get(sessionId);
  if (chat === undefined) return;
  const launchedAt: number = Date.now();
  launches.expect(resumedChatTarget(sessionId, chat.name), launchedAt);
  void resumeLaunched(sessionId, launchedAt, openChats.wasCutMidWork(sessionId));
}

async function resumeLaunched(sessionId: string, launchedAt: number, afterCut: boolean): Promise<void> {
  // The main process only resumes chats from its own latest list of past chats.
  await window.radar.listPastChats();
  const result: ActionResult = await window.radar.resumeChat(sessionId, afterCut);
  if (!result.ok) launches.fail(launchedAt, result.error ?? 'Could not reopen the chat.');
}

// A chat newly in Needs you gets a desktop notification, unless it is already in front of the user: its terminal
// has focus, or its panel is open in a focused Orbit. Orbit Web never notifies.
function announceNeedsYou(now: number): void {
  if (isWebHost()) return;
  const needs: readonly ChatSnapshot[] = toBoardColumns(chats, (chat: ChatSnapshot): boolean => seen.isUnseen(chat), now, (chat: ChatSnapshot): RestingColumn | null => restingPins.pinOf(chat))
    .find((column: BoardColumn) => column.key === 'needs')?.chats ?? [];
  for (const chat of needsYouWatch.arrivals(needs)) {
    const inView: boolean = chat.isFocused || (sheet.sessionId === chat.sessionId && document.hasFocus());
    if (!inView) void window.radar.notifyNeedsYou(chat.sessionId, chat.name);
  }
}

// A clicked notification: Orbit is already brought up by the main process; the chat opens on the board.
function openFromNotification(sessionId: string): void {
  if (view !== 'board') setView('board');
  if (sheet.sessionId !== sessionId) openSheet(sessionId);
}

function openSheet(sessionId: string): void {
  if (view === 'grid') return;
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  const closed: ClosedChat | undefined = chat === undefined ? closedChats.find(sessionId) : undefined;
  if (closed !== undefined) {
    sheet.openClosed(closed.chat, closedCardLabel(closed.kind));
    renderView();
    void refreshSheet();
    return;
  }
  if (chat === undefined) return;
  sheet.open(chat);
  trackViewing(Date.now());
  renderView();
  void refreshSheet();
}

// Voice "chat N": the panel opens on the chat with its composer ready for the words that follow. The Panel has no side
// panel, so there the chat's tile takes the cursor. A touch screen is left alone: focusing raises the keyboard.
function openChatByVoice(sessionId: string): boolean {
  if (view === 'grid') return grid.focusTile(sessionId);
  openSheet(sessionId);
  if (!isTouchWeb()) sheet.focusComposer();
  return sheet.sessionId === sessionId;
}

// The chat a spoken "orbit pin" or "orbit suspend" is about, and where to point the confirmation: the Panel tile that has
// the cursor, or else the open side panel.
interface SpokenTarget {
  readonly sessionId: string;
  readonly anchor: HTMLElement;
}

function spokenTarget(): SpokenTarget | null {
  const tile: HTMLElement | null = document.activeElement?.closest<HTMLElement>(TILE_SESSION_SELECTOR) ?? null;
  const tileSession: string | undefined = tile?.dataset[TILE_SESSION_ATTRIBUTE];
  if (view === 'grid') return tile !== null && tileSession !== undefined ? { sessionId: tileSession, anchor: tile } : null;
  return sheet.sessionId === null ? null : { sessionId: sheet.sessionId, anchor: requireElement('#sheet-name') };
}

function suspendByVoice(): void {
  const target: SpokenTarget | null = spokenTarget();
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === target?.sessionId);
  if (target === null || chat === undefined) return showVoiceNotice('No open chat to suspend');
  suspension.request(chat, target.anchor);
}

function pinByVoice(pinned: boolean): void {
  const target: SpokenTarget | null = spokenTarget();
  if (target === null) return showVoiceNotice(pinned ? 'No open chat to pin' : 'No open chat to unpin');
  if (pinned) pins.pin(target.sessionId);
  else pins.unpin(target.sessionId);
  renderView();
}

function closeSheet(): void {
  sheet.close();
  trackViewing(Date.now());
  renderView();
}

// A chat is being looked at while its panel is open here or its terminal window has focus;
// leaving it (another chat, closing the panel, focusing elsewhere) is what marks it seen.
function trackViewing(now: number): void {
  const viewing: Set<string> = new Set(
    chats.filter((chat: ChatSnapshot) => chat.isFocused || chat.sessionId === sheet.sessionId).map((chat: ChatSnapshot) => chat.sessionId),
  );
  seen.updateViewing(viewing, now);
}

// Signs the desktop browser in through the token, like a scanned QR; with Orbit Web off, its settings explain how.
async function openWebInBrowser(): Promise<void> {
  const settings: RemoteSettings = await window.radar.getRemoteSettings();
  if (!settings.running) return showRemoteSettings();
  window.open(settings.pairingUrl ?? `${settings.localUrl}/#${PAIRING_HASH_KEY}=${settings.token}`, '_blank');
}

function showUsageSettings(): void {
  settingsPage = 'usage';
  if (view !== 'settings') setView('settings');
  else renderView();
}

// The phone pairs through the QR code on Settings' Orbit Web page.
function showRemoteSettings(): void {
  settingsPage = 'web';
  if (view !== 'settings') setView('settings');
  else renderView();
}

function setView(next: ViewName): void {
  if (next === 'settings' && view !== 'settings') viewBeforeSettings = view;
  view = next;
  grid.setShown(view === 'grid');
  // The Panel's tiles already show each chat, so the side panel has no place there.
  if (view === 'grid' && sheet.sessionId !== null) closeSheet();
  else renderView();
}

function setTimelineRange(next: TimelineRange): void {
  timelineRange = next;
  saveTimelineRange(next);
  renderView();
}

function setTimelineMode(next: TimelineMode): void {
  timelineMode = next;
  saveTimelineMode(next);
  renderView();
}

function setTimelineScope(next: TimelineScope): void {
  timelineHistory.setScope(next);
  renderView();
}

function setTheme(next: ThemePreference): void {
  theme = next;
  applyTheme(next);
  saveTheme(next);
  renderView();
}

// Cards are rebuilt every poll, so a full click (down + up) could straddle a rebuild and be lost.
viewRoot.addEventListener('pointerdown', (event: PointerEvent): void => {
  if (event.button !== PRIMARY_BUTTON) return;
  const themeChoice: string | undefined = (event.target as HTMLElement).closest<HTMLElement>('[data-theme-choice]')?.dataset[THEME_CHOICE_ATTRIBUTE];
  if (themeChoice !== undefined && isThemePreference(themeChoice)) return setTheme(themeChoice);
  const rangeChoice: string | undefined = (event.target as HTMLElement).closest<HTMLElement>('[data-timeline-range]')?.dataset[TIMELINE_RANGE_ATTRIBUTE];
  if (rangeChoice !== undefined && isTimelineRange(rangeChoice)) return setTimelineRange(rangeChoice);
  const scopeChoice: string | undefined = (event.target as HTMLElement).closest<HTMLElement>('[data-timeline-scope]')?.dataset[TIMELINE_SCOPE_ATTRIBUTE];
  if (scopeChoice !== undefined && isTimelineScope(scopeChoice)) return setTimelineScope(scopeChoice);
  const modeChoice: string | undefined = (event.target as HTMLElement).closest<HTMLElement>('[data-timeline-mode]')?.dataset[TIMELINE_MODE_ATTRIBUTE];
  if (modeChoice !== undefined && isTimelineMode(modeChoice)) return setTimelineMode(modeChoice);
  if (cardRename.isActive) return;
  // Checked before the card's own press, which would otherwise open or start dragging the card under the icon.
  const device: CardDeviceKind | null = cardDeviceAt(event.target);
  const deviceSession: string | undefined = device === null ? undefined : cardSessionAt(event.target);
  if (device !== null && deviceSession !== undefined) return void openCardDevice(device, deviceSession);
  if (openTimelineAgent(event.target)) return;
  if (view === 'board' && cardDrag.begin(event)) return;
  const sessionId: string | undefined = cardSessionAt(event.target);
  if (sessionId !== undefined) toggleSheet(sessionId);
});

viewRoot.addEventListener('contextmenu', (event: MouseEvent): void => {
  const card: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(`[data-${SESSION_ATTRIBUTE}]`);
  const sessionId: string | undefined = card?.dataset[SESSION_ATTRIBUTE];
  const live: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  const closed: ClosedChat | undefined = live === undefined && sessionId !== undefined ? closedChats.find(sessionId) : undefined;
  const chat: ChatSnapshot | undefined = live ?? closed?.chat;
  if (card === null || chat === undefined || cardRename.isActive) return;
  event.preventDefault();
  const inPinnedRow: boolean = card.closest('.pinned-row') !== null;
  const target: CardMenuTarget = {
    sessionId: chat.sessionId, name: chat.name, isPinned: pins.has(chat.sessionId), inPinnedRow,
    isClosed: live === undefined, isSuspended: closed?.kind === 'suspended', isLeftOpen: closed?.kind === 'left-open',
  };
  cardMenu.open(target, event.clientX, event.clientY);
});

// A click, not a press: on a phone a press also starts every scroll. A click lost to a rebuild is simply repeated.
viewRoot.addEventListener('click', (event: MouseEvent): void => {
  if ((event.target as HTMLElement).closest(SUSPENDED_TOGGLE_SELECTOR) !== null) suspension.toggleCollapsed();
});

// The board is rebuilt every poll, so the card that was right-clicked may be gone by the time a menu item is picked.
function liveCard(target: CardMenuTarget): HTMLElement | null {
  const area: string = target.inPinnedRow ? '.pinned-row' : '.board';
  return viewRoot.querySelector<HTMLElement>(`${area} [data-${SESSION_ATTRIBUTE}="${CSS.escape(target.sessionId)}"]`);
}

// A timeline bar opens its agent's own transcript in the panel, not the chat it belongs to.
function openTimelineAgent(target: EventTarget | null): boolean {
  const bar: HTMLElement | null = (target as HTMLElement).closest<HTMLElement>('[data-timeline-agent]');
  if (bar === null) return false;
  const agentId: string | undefined = bar.dataset[TIMELINE_AGENT_ATTRIBUTE];
  const sessionId: string | undefined = cardSessionAt(bar);
  if (agentId === undefined || sessionId === undefined) return false;
  openSheet(sessionId);
  sheet.openAgent(agentId);
  return true;
}

function cardSessionAt(target: EventTarget | null): string | undefined {
  return (target as HTMLElement).closest<HTMLElement>(`[data-${SESSION_ATTRIBUTE}]`)?.dataset[SESSION_ATTRIBUTE];
}

nav.addEventListener('click', (event: MouseEvent): void => {
  const tab: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(`[data-${VIEW_ATTRIBUTE}]`);
  const name: string | undefined = tab?.dataset[VIEW_ATTRIBUTE];
  if (name !== undefined) setView(name as ViewName);
});

// Escape is listed in the shortcut registry but handled here: the menu, then the panel's sub-action, then the
// panel itself backs out, also while typing in the composer.
document.addEventListener('keydown', (event: KeyboardEvent): void => {
  if (event.key === CLOSE_KEY && !cardMenu.dismiss() && !sheet.dismissSubAction()) closeSheet();
});

requireElement('#reopen-chat').addEventListener('click', (): void => {
  if (sheet.sessionId !== null) void reopenClosed(sheet.sessionId);
});
settingsButton.innerHTML = GEAR_ICON;
settingsButton.addEventListener('click', (): void => setView(view === 'settings' ? viewBeforeSettings : 'settings'));
installTooltips();
renderWordmark(requireElement('#app-title'));
window.radar.onOpenChatRequest(openFromNotification);
attachAppMenu(requireElement('#app-title .wordmark'), (): void => help.open(), remoteSection === null ? null : {
  openInBrowser: (): void => void openWebInBrowser(),
  pairPhone: showRemoteSettings,
}, {
  pauseAll: (): void => void chatPause.pauseAll(),
  continueAll: (): void => void chatPause.continueAll(),
  pausedCount: (): number => chatPause.pausedCount,
});
// The failure is kept on the badge's tooltip, where the user is already looking.
function signIn(): void {
  openSignIn((problem: string): void => {
    console.error(`Sign-in: ${problem}`);
    signInBadge.root.title = problem;
  });
}
const signInBadge: SignInBadge = new SignInBadge(signIn);
const usageBadge: UsageBadge = new UsageBadge(showUsageSettings);
requireElement('#resume-chat').before(usageBadge.root);
requireElement('#resume-chat').before(signInBadge.root);
const resumeButton: ResumeButton = new ResumeButton(requireElement('#resume-chat'), launches, peekPastChat, (sessionId: string): boolean => openChats.wasCutMidWork(sessionId));
const newChatButton: NewChatButton = new NewChatButton(requireElement('#new-chat'), launches);
installShortcutDispatcher(
  appShortcutBindings({
    setView,
    newChat: newChatButton,
    resume: resumeButton,
    help,
    isBoardShown: (): boolean => view === 'board',
    isPanelOpen: (): boolean => document.body.classList.contains('panel-open'),
    canOpenChats: (): boolean => view !== 'grid',
    boardFocus,
    openChat: openSheet,
    pinnedOrder: (): readonly string[] => suspension.pinnedInRow(pins.order),
    sheet,
    togglePin: (sessionId: string): void => {
      pins.toggle(sessionId);
      renderView();
    },
    openWindow: (sessionId: string): void => void window.radar.openChatWindow(sessionId),
    goToTerminal: (sessionId: string): void => {
      const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
      if (chat !== undefined) void window.radar.focusChat(chat.pid);
    },
    isTimelineShown: (): boolean => view === 'timeline',
    timelineMode: (): TimelineMode => timelineMode,
    setTimelineMode,
    timelineScope: (): TimelineScope => timelineHistory.scope,
    setTimelineScope,
    timelineRange: (): TimelineRange => timelineRange,
    setTimelineRange,
  }),
  isOverlayOpen,
  isWebHost(),
);
installShortcutTooltips();
const voiceSelectors: readonly VoiceSelector[] = [newChatButton, resumeButton];
installVoiceCommandContext(createNavigationContext({
  setView,
  openChat: openChatByVoice,
  closePanel: closeSheet,
  selectors: voiceSelectors,
  // The pills are hidden for a chat without that device, so a hidden one means there is nothing to open.
  openDevice: (device: 'emulator' | 'browser'): void => {
    const pill: HTMLButtonElement = requireElement(device === 'emulator' ? '#action-emulator' : '#action-browser');
    if (!pill.hidden) pill.click();
  },
  // Only one popover at a time.
  openNewChat: (): void => {
    resumeButton.close();
    newChatButton.openMenu();
  },
  openResume: (): void => {
    newChatButton.close();
    resumeButton.open();
  },
  suspendChat: suspendByVoice,
  pinChat: pinByVoice,
}));
applyTheme(theme);
void refreshChats();
void refreshUsage();
setInterval((): void => void refreshChats(), CHATS_POLL_MS);
setInterval((): void => void refreshUsage(), USAGE_POLL_MS);
