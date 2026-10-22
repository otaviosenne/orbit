import { fitPinnedRows } from './fit-pinned-rows';
import { fitRestingColumns } from './fit-resting-columns';
import { fitSuspendedRow } from './fit-suspended-row';

// The Pinned and Suspended strips' heights decide how much the columns get, so they are settled first.
export function fitBoard(root: HTMLElement): void {
  fitPinnedRows(root);
  fitSuspendedRow(root);
  fitRestingColumns(root);
}
