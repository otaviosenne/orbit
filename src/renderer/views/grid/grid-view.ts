import type { ChatDevices, ChatSnapshot } from '../../../shared/types';
import { BoardDevices } from '../../board/board-devices';
import type { CardDeviceKind } from '../../board/card-devices';
import { openCardDevice } from '../../board/card-devices';
import { element } from '../../dom';
import type { Lightbox } from '../../lightbox';
import { GridLayoutStore } from './grid-layout-store';
import { GridSidebar } from './grid-sidebar';
import { SidebarCollapse } from './sidebar-collapse';
import type { GridSize, GridState } from './grid-state';
import { autoLayout, liveOrder } from './grid-state';
import type { QuickSelection } from './quick-select';
import type { BoardColumn } from '../board-columns';
import { GridTile } from './grid-tile';
import { GridControls } from './grid-controls';
import { syncChildren } from './keyed-children';
import { TileDrag } from './tile-drag';
import { TileZoom } from './tile-zoom';
import { isTileInView } from './tile-visibility';
import { formatZoom } from './zoom-level';

const ZOOM_PROPERTY: string = '--tile-zoom';
const COLLAPSED_CLASS: string = 'is-sidebar-collapsed';

// The board's grouping of chats (Needs you, Working, Active, Idle), which needs the hub's seen tracking.
export type ChatGrouping = (chats: readonly ChatSnapshot[], now: number) => readonly BoardColumn[];

// The "Panel" view: chats picked in the sidebar, each a live tile in a columns × rows grid.
// It owns its elements and updates them in place, so polling never resets a tile.
export class GridView {
  readonly root: HTMLElement = element('div', 'grid-view');
  private readonly store: GridLayoutStore = new GridLayoutStore();
  private readonly tiles: Map<string, GridTile> = new Map();
  private readonly controls: GridControls;
  private readonly sidebar: GridSidebar;
  private readonly scroller: HTMLElement = element('div', 'grid-scroller');
  private readonly area: HTMLElement = element('div', 'grid-tiles');
  private readonly empty: HTMLElement = element('p', 'grid-empty', 'Pick chats on the left to watch them here.');
  private readonly drag: TileDrag;
  private readonly zoom: TileZoom;
  private readonly collapse: SidebarCollapse = new SidebarCollapse();
  // Tiles a poll skipped for being scrolled out of view; scrolling one back in fetches it without waiting a poll.
  private readonly unpolled: Set<GridTile> = new Set();
  // Asked about only while the Panel is shown, since only update() follows it; the board keeps its own.
  private readonly devices: BoardDevices = new BoardDevices(
    (sessionId: string): Promise<ChatDevices> => window.radar.getChatDevices(sessionId),
    (): void => this.render(),
  );
  private chats: readonly ChatSnapshot[] = [];
  private now: number = 0;

  constructor(private readonly lightbox: Lightbox, private readonly grouping: ChatGrouping) {
    this.zoom = new TileZoom(this.area, (zoom: number): void => this.applyZoom(zoom));
    this.controls = new GridControls({
      setColumns: (columns: GridSize): void => this.changeLayout((): void => this.store.setColumns(columns)),
      setRows: (rows: GridSize): void => this.changeLayout((): void => this.store.setRows(rows)),
      stepZoom: (direction: 1 | -1): void => this.zoom.step(direction),
    });
    this.sidebar = new GridSidebar(
      (sessionId: string): void => this.toggle(sessionId),
      this.controls.root,
      (): void => {
        this.collapse.toggle();
        this.showCollapse();
      },
      (selection: QuickSelection): void => this.quickSelect(selection),
    );
    this.showCollapse();
    this.drag = new TileDrag(this.area, this.scroller, (sessionId: string, targetId: string): void => {
      this.store.move(sessionId, targetId);
      this.render();
    });
    this.scroller.append(this.area);
    this.scroller.addEventListener('scroll', (): void => this.refreshUncovered(), { passive: true });
    const main: HTMLElement = element('section', 'grid-main');
    main.append(this.scroller, this.empty);
    this.root.append(this.sidebar.root, main);
    this.applyZoom(this.zoom.zoom);
  }

  // Puts the view in place only when it is not there yet; leaving for another view and coming back
  // re-attaches the same tiles.
  mount(host: HTMLElement): void {
    if (this.root.parentElement === host) return;
    host.replaceChildren(this.root);
    this.tiles.forEach((tile: GridTile): void => tile.followEnd());
  }

  update(chats: readonly ChatSnapshot[], now: number): void {
    this.chats = chats;
    this.now = now;
    this.render();
    this.tiles.forEach((tile: GridTile): void => this.refreshIfShown(tile));
    void this.devices.follow([...this.tiles.keys()], now);
  }

  // Off-screen tiles are not polled; their threads would be fetched and rendered for nobody.
  private refreshIfShown(tile: GridTile): void {
    if (!isTileInView(tile.root, this.scroller)) {
      this.unpolled.add(tile);
      return;
    }
    this.unpolled.delete(tile);
    void tile.refresh();
  }

  private refreshUncovered(): void {
    for (const tile of this.unpolled) if (isTileInView(tile.root, this.scroller)) this.refreshIfShown(tile);
  }

  private render(): void {
    const state: GridState = this.store.state;
    const shown: GridTile[] = this.shownTiles(state);
    this.sidebar.update(this.chats, (sessionId: string): boolean => this.store.has(sessionId));
    this.controls.showLayout(state);
    this.root.style.setProperty('--grid-columns', String(state.columns));
    this.root.style.setProperty('--grid-rows', String(state.rows));
    // The dragged tile is measured against the others; moving any of them mid-drag would put it in the wrong place.
    // One row leaves each tile tall enough to keep its message field open; shorter tiles fold it to a button.
    shown.forEach((tile: GridTile): void => tile.setComposerAlwaysOpen(state.rows === 1));
    if (!this.drag.isActive) syncChildren(this.area, shown.map((tile: GridTile) => tile.root));
    this.empty.hidden = shown.length > 0;
  }

  private shownTiles(state: GridState): GridTile[] {
    const live: Map<string, ChatSnapshot> = new Map(this.chats.map((chat: ChatSnapshot) => [chat.sessionId, chat]));
    this.forgetRemoved(state.order);
    return liveOrder(state.order, new Set(live.keys())).map((sessionId: string) => {
      const chat: ChatSnapshot = live.get(sessionId) as ChatSnapshot;
      const tile: GridTile = this.tileFor(chat);
      tile.update(chat, this.now, this.devices.devicesOf(sessionId));
      return tile;
    });
  }

  // A chat missing from one poll keeps its tile (and draft); only taking it out of the grid drops it.
  private forgetRemoved(order: readonly string[]): void {
    for (const [sessionId, tile] of this.tiles) {
      if (order.includes(sessionId)) continue;
      this.tiles.delete(sessionId);
      this.unpolled.delete(tile);
    }
  }

  private tileFor(chat: ChatSnapshot): GridTile {
    const existing: GridTile | undefined = this.tiles.get(chat.sessionId);
    if (existing !== undefined) return existing;
    const tile: GridTile = new GridTile(chat, this.lightbox, {
      remove: (sessionId: string): void => this.toggle(sessionId),
      openDevice: (kind: CardDeviceKind, sessionId: string): void => void openCardDevice(kind, sessionId, this.devices),
    });
    this.tiles.set(chat.sessionId, tile);
    // Fetched at once rather than on the next poll, so the tile is not empty for up to a poll.
    void tile.refresh();
    return tile;
  }

  private toggle(sessionId: string): void {
    this.store.toggle(sessionId);
    this.fitLayout();
    this.render();
  }

  private quickSelect(selection: QuickSelection): void {
    this.store.setOrder(this.chatsFor(selection).map((chat: ChatSnapshot) => chat.sessionId));
    this.fitLayout();
    this.render();
  }

  private chatsFor(selection: QuickSelection): readonly ChatSnapshot[] {
    if (selection === 'none') return [];
    if (selection === 'all') return this.chats;
    return this.grouping(this.chats, this.now).find((column: BoardColumn) => column.key === selection)?.chats ?? [];
  }

  // Adding or removing tiles resizes the grid to fit them; picking columns/rows by hand still overrides it.
  private fitLayout(): void {
    const liveIds: Set<string> = new Set(this.chats.map((chat: ChatSnapshot) => chat.sessionId));
    this.store.setLayout(autoLayout(liveOrder(this.store.state.order, liveIds).length));
  }

  // Tiles reading their latest messages stay at the end while the text resizes under them.
  private applyZoom(zoom: number): void {
    const atEnd: GridTile[] = [...this.tiles.values()].filter((tile: GridTile) => tile.isAtEnd());
    this.root.style.setProperty(ZOOM_PROPERTY, formatZoom(zoom));
    atEnd.forEach((tile: GridTile): void => tile.followEnd());
    this.controls.showZoom(zoom);
  }

  private showCollapse(): void {
    this.root.classList.toggle(COLLAPSED_CLASS, this.collapse.isCollapsed);
  }

  private changeLayout(change: () => void): void {
    change();
    this.render();
  }
}
