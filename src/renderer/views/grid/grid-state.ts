// Tiles across or down one screen of the grid; more tiles than that scroll. One suits a narrow or short window.
export type GridSize = 1 | 2 | 3;

export const GRID_SIZES: readonly GridSize[] = [1, 2, 3];

export interface GridState {
  // Every chat added to the grid, in tile order, including ones not live right now.
  readonly order: readonly string[];
  readonly columns: GridSize;
  readonly rows: GridSize;
}

export const DEFAULT_GRID_STATE: GridState = { order: [], columns: 2, rows: 2 };

export interface GridLayout {
  readonly columns: GridSize;
  readonly rows: GridSize;
}

// Smallest grid that fits this many tiles, growing columns before rows: 1 → 1×1, 2 → 2×1, 3–4 → 2×2,
// 5–6 → 3×2, then 3×3 (more than nine scroll).
const AUTO_LAYOUTS: readonly GridLayout[] = [
  { columns: 1, rows: 1 },
  { columns: 2, rows: 1 },
  { columns: 2, rows: 2 },
  { columns: 3, rows: 2 },
  { columns: 3, rows: 3 },
];

export function autoLayout(tileCount: number): GridLayout {
  const fits: GridLayout | undefined = AUTO_LAYOUTS.find((layout: GridLayout) => layout.columns * layout.rows >= tileCount);
  return fits ?? AUTO_LAYOUTS[AUTO_LAYOUTS.length - 1] ?? { columns: 3, rows: 3 };
}

export function isGridSize(value: unknown): value is GridSize {
  return GRID_SIZES.includes(value as GridSize);
}

// Stored state comes from an older or hand-edited copy, so every field is checked and falls back on its own.
export function parseGridState(raw: unknown): GridState {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_GRID_STATE;
  const candidate: Record<string, unknown> = raw as Record<string, unknown>;
  return {
    order: parseOrder(candidate['order']),
    columns: isGridSize(candidate['columns']) ? candidate['columns'] : DEFAULT_GRID_STATE.columns,
    rows: isGridSize(candidate['rows']) ? candidate['rows'] : DEFAULT_GRID_STATE.rows,
  };
}

function parseOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = raw.filter((value: unknown): value is string => typeof value === 'string');
  return [...new Set(ids)];
}

// Adds a chat as the last tile, or takes it out of the grid if it is already there.
export function toggleChat(order: readonly string[], sessionId: string): string[] {
  return order.includes(sessionId) ? order.filter((id: string) => id !== sessionId) : [...order, sessionId];
}

// The dragged chat takes the target's place; the chats in between shift by one. Chats that are not live keep
// their place in the stored order, so they come back where they were.
export function moveChat(order: readonly string[], sessionId: string, targetId: string): string[] {
  const from: number = order.indexOf(sessionId);
  const to: number = order.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return [...order];
  const moved: string[] = order.filter((id: string) => id !== sessionId);
  moved.splice(to, 0, sessionId);
  return moved;
}

// The tiles to show: the stored order without chats that are not live right now.
export function liveOrder(order: readonly string[], liveIds: ReadonlySet<string>): string[] {
  return order.filter((id: string) => liveIds.has(id));
}
