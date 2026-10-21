import type { ActionResult, ChatSnapshot, UsageSnapshot } from '../shared/types';
import type { BoardColumn } from './views/board-columns';
import { toBoardColumns } from './views/board-columns';
import { TIMELINE_AGENT_ATTRIBUTE } from './views/timeline-track';
import { CardDrag } from './board/card-drag';
import { RestingPins } from './board/resting-pins';
import type { RestingColumn } from './views/board-columns';
import { installTooltips } from './tooltip';
import { attachAppMenu } from './app-menu';
import { GEAR_ICON } from './icons';
import { requireElement } from './dom';
import type { ViewName } from './nav';
import { VIEW_ATTRIBUTE, renderNav, viewForKey } from './nav';
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
import { renderSettings } from './views/settings-view';
import type { TimelineChats } from './views/timeline-view';
import { mountTimeline, renderTimeline } from './views/timeline-view';
import { GridView } from './views/grid/grid-view';
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

const CHATS_POLL_MS: number = 2000;
const USAGE_POLL_MS: number = 30_000;
const CLOSE_KEY: string = 'Escape';
const PRIMARY_BUTTON: number = 0;

const nav: HTMLElement = requireElement('#nav');
const settingsButton: HTMLButtonElement = requireElement('#settings-button');
const viewRoot: HTMLElement = requireElement('#view');
const grid: GridView = new GridView(new Lightbox(), (list: readonly ChatSnapshot[], now: number): readonly BoardColumn[] =>
  toBoardColumns(list, (chat: ChatSnapshot): boolean => seen.isUnseen(chat), now, (chat: ChatSnapshot): RestingColumn | null => restingPins.pinOf(chat)),
);
const pendingEdits: PendingEdits = new PendingEdits();
const seen: SeenTracker = new SeenTracker(Date.now());
const pins: PinnedChats = new PinnedChats();
const restingPins: RestingPins = new RestingPins();
// Active and Idle cards open on release instead of press, so a press can turn into a drag between the two.
const cardDrag: CardDrag = new CardDrag(viewRoot, {
  click: (sessionId: string): void => toggleSheet(sessionId),
  move: (sessionId: string, to: RestingColumn): void => {
    const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
    if (chat !== undefined) restingPins.set(chat, to);
    // Optimistic: the card lands in its new column now, not at the next poll.
    renderView();
  },
  changed: (): void => renderView(),
});
const cardRename: CardRename = new CardRename((sessionId: string, name: string): void => void renameChat(sessionId, name), (): void => renderView());
const cardMenu: CardMenu = new CardMenu({
  openWindow: (target: CardMenuTarget): void => void window.radar.openChatWindow(target.sessionId),
  togglePin: (target: CardMenuTarget): void => {
    pins.toggle(target.sessionId);
    renderView();
  },
  rename: (target: CardMenuTarget): void => {
    const card: HTMLElement | null = liveCard(target);
    if (card !== null) cardRename.start(card, target.sessionId, target.name);
  },
  close: (target: CardMenuTarget): void => void closeChat(target.sessionId),
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
}, (): void => void refreshSheet());
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

async function refreshChats(): Promise<void> {
  polledChats = await window.radar.getChats();
  closing.settle(polledChats, Date.now());
  showChats();
  launches.settle(Date.now());
  await refreshSheet();
}

// Re-renders from the last poll plus pending edits, without waiting for the next poll.
function showChats(): void {
  const now: number = Date.now();
  chats = closing.hide(pendingEdits.apply(polledChats, now));
  trackViewing(now);
  renderView();
  const open: ChatSnapshot | undefined = chats.find((chat: ChatSnapshot) => chat.sessionId === sheet.sessionId);
  if (open !== undefined) sheet.update(open);
}

async function refreshUsage(): Promise<void> {
  usage = await window.radar.getUsage();
  if (view === 'settings') renderView();
}

function renderView(): void {
  const now: number = Date.now();
  nav.replaceChildren(...renderNav(view));
  settingsButton.classList.toggle('is-active', view === 'settings');
  // A card being renamed holds an open text field; rebuilding the board would throw the typing away.
  if (view === 'board' && (cardRename.isActive || cardDrag.isActive)) return;
  if (view === 'board') viewRoot.replaceChildren(renderBoard(chats, boardMarks(), now));
  else if (view === 'grid') showGrid(now);
  else if (view === 'timeline') showTimeline(now);
  else viewRoot.replaceChildren(renderSettings(theme, usage, now));
}

// Tiles hold scroll, open rows and drafts, so the grid is mounted once and updated in place instead of rebuilt.
function showGrid(now: number): void {
  grid.mount(viewRoot);
  grid.update(chats, now);
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
    restingPin: (chat: ChatSnapshot): RestingColumn | null => restingPins.pinOf(chat),
  };
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
async function closeChat(sessionId: string): Promise<void> {
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat === undefined) return;
  closing.start(sessionId, Date.now());
  if (sheet.sessionId === sessionId) sheet.close();
  showChats();
  const result: ActionResult = await window.radar.closeChat(chat.pid);
  if (result.ok) return;
  console.error(`Could not close ${chat.name}: ${result.error ?? 'unknown error'}`);
  closing.cancel(sessionId);
  showChats();
}

async function refreshSheet(): Promise<void> {
  const sessionId: string | null = sheet.sessionId;
  if (sessionId === null) return;
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat === undefined) return closeSheet();
  sheet.update(chat);
  await loadThread(sheet, chat);
}

// Clicking the chat that is already open closes the panel; any other chat opens (or switches) it.
function toggleSheet(sessionId: string): void {
  if (sheet.sessionId === sessionId) closeSheet();
  else openSheet(sessionId);
}

function openSheet(sessionId: string): void {
  if (view === 'grid') return;
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === sessionId);
  if (chat === undefined) return;
  sheet.open(chat);
  trackViewing(Date.now());
  renderView();
  void refreshSheet();
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

function setView(next: ViewName): void {
  if (next === 'settings' && view !== 'settings') viewBeforeSettings = view;
  view = next;
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
  if (openTimelineAgent(event.target)) return;
  if (view === 'board' && cardDrag.begin(event)) return;
  const sessionId: string | undefined = cardSessionAt(event.target);
  if (sessionId !== undefined) toggleSheet(sessionId);
});

viewRoot.addEventListener('contextmenu', (event: MouseEvent): void => {
  const card: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(`[data-${SESSION_ATTRIBUTE}]`);
  const chat: ChatSnapshot | undefined = chats.find((candidate: ChatSnapshot) => candidate.sessionId === card?.dataset[SESSION_ATTRIBUTE]);
  if (card === null || chat === undefined || cardRename.isActive) return;
  event.preventDefault();
  const inPinnedRow: boolean = card.closest('.pinned-row') !== null;
  cardMenu.open({ sessionId: chat.sessionId, name: chat.name, isPinned: pins.has(chat.sessionId), inPinnedRow }, event.clientX, event.clientY);
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

document.addEventListener('keydown', (event: KeyboardEvent): void => {
  if (event.key === CLOSE_KEY) {
    if (!cardMenu.dismiss() && !sheet.dismissSubAction()) closeSheet();
    return;
  }
  if (isTyping(event.target)) return;
  const next: ViewName | null = viewForKey(event.key);
  if (next !== null) setView(next);
});

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

settingsButton.innerHTML = GEAR_ICON;
settingsButton.addEventListener('click', (): void => setView(view === 'settings' ? viewBeforeSettings : 'settings'));
installTooltips();
renderWordmark(requireElement('#app-title'));
attachAppMenu(requireElement('#app-title .wordmark'));
new ResumeButton(requireElement('#resume-chat'), launches);
new NewChatButton(requireElement('#new-chat'), launches);
applyTheme(theme);
void refreshChats();
void refreshUsage();
setInterval((): void => void refreshChats(), CHATS_POLL_MS);
setInterval((): void => void refreshUsage(), USAGE_POLL_MS);
