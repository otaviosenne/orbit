import type { GridLayout, GridSize, GridState } from './grid-state';
import { DEFAULT_GRID_STATE, moveChat, parseGridState, toggleChat } from './grid-state';

const STORAGE_KEY: string = 'orbit.grid';

// The grid's chats, their order and its columns and rows, kept across launches.
export class GridLayoutStore {
  private current: GridState = load();

  get state(): GridState {
    return this.current;
  }

  has(sessionId: string): boolean {
    return this.current.order.includes(sessionId);
  }

  toggle(sessionId: string): void {
    this.change({ order: toggleChat(this.current.order, sessionId) });
  }

  move(sessionId: string, targetId: string): void {
    this.change({ order: moveChat(this.current.order, sessionId, targetId) });
  }

  // Replaces the whole selection (the quick-select buttons).
  setOrder(order: readonly string[]): void {
    this.change({ order: [...order] });
  }

  setLayout(layout: GridLayout): void {
    this.change({ columns: layout.columns, rows: layout.rows });
  }

  setColumns(columns: GridSize): void {
    this.change({ columns });
  }

  setRows(rows: GridSize): void {
    this.change({ rows });
  }

  private change(patch: Partial<GridState>): void {
    this.current = { ...this.current, ...patch };
    save(this.current);
  }
}

// Storage can be unavailable; then the grid simply lasts for this run.
function load(): GridState {
  try {
    const stored: string | null = localStorage.getItem(STORAGE_KEY);
    return stored === null ? DEFAULT_GRID_STATE : parseGridState(JSON.parse(stored));
  } catch {
    return DEFAULT_GRID_STATE;
  }
}

function save(state: GridState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Not persisted.
  }
}
