import { element } from '../../dom';
import { SegmentedControl } from './segmented-control';
import type { SegmentOption } from './segmented-control';
import type { GridSize, GridState } from './grid-state';
import { GRID_SIZES } from './grid-state';
import { ZoomControl } from './zoom-control';

export interface GridControlHandlers {
  readonly setColumns: (columns: GridSize) => void;
  readonly setRows: (rows: GridSize) => void;
  readonly stepZoom: (direction: 1 | -1) => void;
}

const SIZE_OPTIONS: readonly SegmentOption<GridSize>[] = GRID_SIZES.map((size: GridSize) => ({ value: size, label: String(size) }));

// The grid's layout and text size, at the foot of the sidebar so the tiles get the whole main area.
export class GridControls {
  readonly root: HTMLElement = element('div', 'grid-controls');
  private readonly columns: SegmentedControl<GridSize>;
  private readonly rows: SegmentedControl<GridSize>;
  private readonly zoom: ZoomControl;

  constructor(handlers: GridControlHandlers) {
    this.columns = new SegmentedControl<GridSize>('Columns', SIZE_OPTIONS, handlers.setColumns);
    this.rows = new SegmentedControl<GridSize>('Rows', SIZE_OPTIONS, handlers.setRows);
    this.zoom = new ZoomControl(handlers.stepZoom);
    this.root.append(this.columns.root, this.rows.root, this.zoom.root);
  }

  showLayout(state: GridState): void {
    this.columns.select(state.columns);
    this.rows.select(state.rows);
  }

  showZoom(zoom: number): void {
    this.zoom.show(zoom);
  }
}
