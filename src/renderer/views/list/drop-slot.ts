// Where a dragged row would land: one past every other row whose middle it has passed.
export function targetIndex(midpoints: readonly number[], from: number, draggedMiddle: number): number {
  return midpoints.filter((middle: number, index: number) => index !== from && middle < draggedMiddle).length;
}

// How many row heights a row steps aside while another one is dragged from `from` to `to`: rows between the two
// close the gap the dragged row left (up) or open one where it will land (down).
export function slotShift(index: number, from: number, to: number): -1 | 0 | 1 {
  if (index === from) return 0;
  if (from < to && index > from && index <= to) return -1;
  if (to < from && index >= to && index < from) return 1;
  return 0;
}
